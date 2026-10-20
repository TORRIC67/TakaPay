"""Login, self-registration (residents), password self-service, and 'who am I'."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.phone import normalize_phone
from app.core.ratelimit import client_ip, forgot_per_ip, login_failures, resend_per_ip, signup_per_ip
from app.core.security import create_access_token, hash_password, verify_password
from app.models.customer import Customer
from app.models.provider import ServiceProvider
from app.models.user import Role, User
from app.schemas import (
    ChangePasswordRequest, CustomerCreate, CustomerOut, ForgotPasswordRequest,
    ResendOtpRequest, ResetPasswordRequest, TokenOut, VerifyPhoneRequest,
)
from app.services.customers import create_customer
from app.services.otp import OtpError, WRONG_CODE, check_reset_code, send_reset_otp, send_signup_otp, verify_code
from app.sms.service import get_sms_provider

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Log in with phone number (as 'username') and password."""
    try:
        phone = normalize_phone(form.username)
    except ValueError:
        phone = form.username
    # Guessing passwords is capped per phone number: 10 wrong tries, then a 15-minute pause.
    if login_failures.blocked(phone):
        raise HTTPException(429, "Umekosea mara nyingi. Jaribu tena baada ya dakika 15. / Too many wrong attempts. Try again in 15 minutes.")
    user = db.scalar(select(User).where(User.phone == phone))
    if user is None or not user.is_active or not verify_password(form.password, user.password_hash):
        login_failures.record(phone)
        raise HTTPException(401, "Wrong phone number or password")
    login_failures.clear(phone)
    if user.role == Role.RESIDENT and not user.phone_verified:
        # The frontend recognises this exact text and shows the OTP screen instead of an error.
        raise HTTPException(403, "PHONE_NOT_VERIFIED")
    return {"access_token": create_access_token(user.id, user.role)}


@router.post("/register", response_model=CustomerOut, status_code=201)
def self_register(data: CustomerCreate, request: Request, db: Session = Depends(get_db)):
    """Optional self-registration: a resident signs up on their own. Role is always 'resident'.
    They must say which zone/provider they belong to (an admin-created customer instead
    gets this automatically from the admin who registers them)."""
    # Every signup costs an OTP SMS and this page is open to everyone, so cap it per visitor.
    if not signup_per_ip.allow(client_ip(request)):
        raise HTTPException(429, "Majaribio mengi sana. Jaribu tena baadaye. / Too many attempts. Try again later.")
    if data.provider_id is None:
        raise HTTPException(400, "provider_id is required")
    provider = db.get(ServiceProvider, data.provider_id)
    if provider is None or not provider.is_active:
        raise HTTPException(404, "Service provider not found")
    return create_customer(db, data, provider_id=provider.id, public=True)


def _unverified_resident(db: Session, phone: str):
    return db.scalar(
        select(User).where(
            User.phone == phone, User.role == Role.RESIDENT, User.is_active.is_(True), User.phone_verified.is_(False)
        )
    )


@router.post("/verify-phone")
def verify_phone(data: VerifyPhoneRequest, db: Session = Depends(get_db)):
    """The customer (or whoever is registering them) types the 6-digit code that was texted to the
    customer's phone. Open to everyone on purpose - the code itself is the proof. Wrong guesses are
    limited per code (see services/otp.py)."""
    user = _unverified_resident(db, data.phone)
    if user is None:
        raise HTTPException(400, WRONG_CODE)  # same answer as a wrong code: reveals nothing about the number
    try:
        verify_code(db, user, data.otp_code)
    except OtpError as exc:
        raise HTTPException(exc.status, str(exc))
    return {"ok": True}


@router.post("/resend-otp")
def resend_otp(data: ResendOtpRequest, request: Request, db: Session = Depends(get_db)):
    """Texts a new code. Limited per phone (cooldown + per hour) and per visitor."""
    if not resend_per_ip.allow(client_ip(request)):
        raise HTTPException(429, "Majaribio mengi sana. Jaribu tena baadaye. / Too many attempts. Try again later.")
    user = _unverified_resident(db, data.phone)
    if user is None:
        return {"ok": True}  # don't reveal whether this number has a pending signup
    try:
        send_signup_otp(db, user, public=True)
    except OtpError as exc:
        raise HTTPException(exc.status, str(exc))
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The frontend calls this after login. residents get their customer_id (needed for the Pay button)."""
    customer = db.scalar(select(Customer).where(Customer.user_id == user.id))
    return {
        "id": user.id,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "customer_id": customer.id if customer else None,
        "customer": CustomerOut.model_validate(customer).model_dump() if customer else None,
        "monthly_fee_tzs": customer.effective_fee_tzs if customer else settings.MONTHLY_FEE_TZS,
    }


# ---------- password: change (logged in) and forgot/reset (via SMS code) ----------
@router.post("/change-password")
def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Any logged-in user (customer, admin or super admin) changes their own password."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(401, "Current password is wrong")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Texts a 6-digit code to the phone on file. Always answers the same way whether or not that
    phone is registered (and whether or not a code could be sent right now), so this can't be used
    to check who has an account. Only the per-visitor limit answers differently."""
    if not forgot_per_ip.allow(client_ip(request)):
        raise HTTPException(429, "Majaribio mengi sana. Jaribu tena baadaye. / Too many attempts. Try again later.")
    try:
        phone = normalize_phone(data.phone)
    except ValueError:
        phone = data.phone
    user = db.scalar(select(User).where(User.phone == phone, User.is_active.is_(True)))
    if user is not None:
        try:
            send_reset_otp(db, user)
        except OtpError:
            pass  # too soon after the last code, or SMS not working: say nothing different
    return {"ok": True, "message": "If that phone number is registered, a code has been sent to it."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Sets a new password if the code is right. Wrong guesses are limited per code (see services/otp.py)."""
    try:
        phone = normalize_phone(data.phone)
    except ValueError:
        phone = data.phone
    user = db.scalar(select(User).where(User.phone == phone, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(400, WRONG_CODE)  # same answer as a wrong code
    try:
        check_reset_code(db, user, data.otp_code)
    except OtpError as exc:
        raise HTTPException(exc.status, str(exc))
    user.password_hash = hash_password(data.new_password)
    user.reset_otp_code = None  # old plain-text column: no longer used, make sure nothing stale remains
    user.reset_otp_expires_at = None
    login_failures.clear(phone)
    db.commit()
    return {"ok": True}

"""Creating a customer = creating a login (User) + the household record (Customer).
Used by self-registration (/auth/register), admin registration (/admin/customers) and field-agent
registration (/agent/customers).

Every new customer starts UNVERIFIED and gets an OTP by SMS. They only become registered (and able
to log in, be billed or pay) after the code is entered, whoever filled in the form."""
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.customer import Customer
from app.models.user import Role, User
from app.schemas import CustomerCreate
from app.services.otp import OtpError, send_signup_otp


def create_customer(
    db: Session, data: CustomerCreate, provider_id: int,
    category: str = "residential", monthly_fee_tzs: Optional[int] = None,
    *, public: bool = False,
) -> Customer:
    """category/monthly_fee_tzs are explicit kwargs (not read off `data` here) on purpose:
    only the admin-registration endpoint passes them through. Self-registration and
    field-agent registration never do, so a caller can never set their own custom fee or
    mark themselves an 'institution', even if those fields are present in the request body.

    public=True means the request came from the open self-registration page; the OTP SMS then
    also counts against the global hourly ceiling.

    If the phone belongs to a signup that was never verified, that half-finished record is
    updated in place instead of answering "already registered" - otherwise a typo would lock the
    number out. Its OTP counters are kept, so re-submitting cannot be used to get around the SMS limits.
    The returned customer carries `otp_sent` / `otp_error` for the caller to show."""
    existing = db.scalar(select(User).where(User.phone == data.phone))

    if existing is not None:
        reusable = existing.role == Role.RESIDENT and existing.is_active and not existing.phone_verified
        if not reusable:
            raise HTTPException(409, "This phone number is already registered")
        user = existing
        user.full_name = data.full_name
        user.password_hash = hash_password(data.password)
        customer = db.scalar(select(Customer).where(Customer.user_id == user.id))
        if customer is None:
            customer = Customer(user_id=user.id, phone=data.phone, provider_id=provider_id)
            db.add(customer)
        customer.ward, customer.address = data.ward, data.address
        customer.latitude, customer.longitude = data.latitude, data.longitude
        customer.provider_id = provider_id
        customer.category, customer.monthly_fee_tzs = category, monthly_fee_tzs
    else:
        user = User(
            full_name=data.full_name,
            phone=data.phone,
            password_hash=hash_password(data.password),
            role=Role.RESIDENT,
            phone_verified=False,
        )
        db.add(user)
        try:
            db.flush()  # gets user.id; also triggers the "phone already used" check
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "This phone number is already registered")
        customer = Customer(
            user_id=user.id,
            phone=data.phone,
            ward=data.ward,
            address=data.address,
            latitude=data.latitude,
            longitude=data.longitude,
            provider_id=provider_id,
            category=category,
            monthly_fee_tzs=monthly_fee_tzs,
        )
        db.add(customer)

    db.commit()
    db.refresh(customer)

    try:
        send_signup_otp(db, user, public=public)
        customer.otp_sent, customer.otp_error = True, None
    except OtpError as exc:
        # The account exists but is unverified; the screen offers "Resend".
        customer.otp_sent, customer.otp_error = False, str(exc)
    return customer

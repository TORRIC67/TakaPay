"""Phone verification for new customers.

A customer only counts as registered once they type back the 6-digit code that was texted to
their phone - no matter who created the account (the customer, an admin or a field agent).

Rules (all adjustable in config.py):
  * a code is valid for OTP_TTL_MINUTES and for OTP_MAX_ATTEMPTS wrong guesses
  * at least OTP_RESEND_COOLDOWN_SECONDS between two codes to the same phone
  * at most OTP_MAX_SENDS_PER_HOUR codes per phone
  * pages that anyone can open (self-registration, "resend") also share a global hourly ceiling,
    because every code costs an SMS and those pages are public
"""
import hashlib
import hmac
import logging
import math
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.ratelimit import otp_global
from app.models.password_reset_otp import PasswordResetOtp
from app.models.phone_otp import PhoneOtp
from app.models.user import User
from app.sms.service import get_sms_provider

log = logging.getLogger("smarttaka.otp")

WRONG_CODE = "Msimbo si sahihi au umeisha muda. / The code is wrong or has expired."


class OtpError(Exception):
    """Something the person can understand and act on. `status` is the HTTP code to answer with."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """SQLite hands datetimes back without a timezone; everything here is UTC."""
    return dt if dt is None or dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _hash_code(user_id: int, code: str, purpose: str = "signup") -> str:
    # Keyed with SECRET_KEY and bound to the user AND the purpose, so a leaked database does not leak
    # usable codes and a signup code can never be used to reset a password (or the other way round).
    key = settings.SECRET_KEY.encode()
    return hmac.new(key, f"{purpose}:{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def _row_for(db: Session, user_id: int, model=PhoneOtp):
    row = db.scalar(select(model).where(model.user_id == user_id).with_for_update())
    if row is None:
        row = model(user_id=user_id)
        db.add(row)
        db.flush()
    return row


def issue_code(db: Session, user: User, *, public: bool = False, model=PhoneOtp, purpose: str = "signup") -> str:
    """Creates a fresh code for `user` (replacing any older one) and returns it in plain text so it
    can be texted. Enforces the cooldown and the hourly limits. Does not commit.
    model/purpose pick which kind of code this is (signup verification or password reset)."""
    now = _now()
    row = _row_for(db, user.id, model)

    last = _aware(row.last_sent_at)
    if last is not None:
        wait = settings.OTP_RESEND_COOLDOWN_SECONDS - (now - last).total_seconds()
        if wait > 0:
            secs = math.ceil(wait)
            raise OtpError(
                f"Subiri sekunde {secs} kabla ya kuomba msimbo mpya. / Wait {secs}s before asking for a new code.", 429
            )

    started = _aware(row.window_started_at)
    if started is None or now - started >= timedelta(hours=1):
        row.window_started_at, row.sends_in_window = now, 0
    if row.sends_in_window >= settings.OTP_MAX_SENDS_PER_HOUR:
        raise OtpError(
            "Umeomba msimbo mara nyingi sana. Jaribu tena baada ya saa moja. / Too many codes requested. Try again in an hour.",
            429,
        )

    if public and not otp_global.allow("all"):
        log.warning("Global OTP ceiling reached; refusing a public OTP request")
        raise OtpError(
            "Huduma ina shughuli nyingi kwa sasa. Jaribu tena baadaye. / The service is busy. Try again later.", 429
        )

    code = f"{secrets.randbelow(1_000_000):06d}"
    row.code_hash = _hash_code(user.id, code, purpose)
    row.expires_at = now + timedelta(minutes=settings.OTP_TTL_MINUTES)
    row.attempts = 0
    row.sends_in_window += 1
    row.last_sent_at = now
    db.flush()
    return code


def _send_code(db: Session, user: User, text, *, public: bool, model, purpose: str) -> None:
    """Creates a code and texts it. `text` is a function that turns the code into the SMS message.
    The send is counted against the limits even when the SMS provider fails, on purpose."""
    code = issue_code(db, user, public=public, model=model, purpose=purpose)
    db.commit()  # keep the counters even if the SMS below fails

    try:
        provider = get_sms_provider()
    except RuntimeError as exc:
        log.error("OTP not sent, SMS is not configured: %s", exc)
        raise OtpError("SMS haijawekwa kwenye mfumo. / SMS is not configured on the server.", 503)

    result = provider.send(user.phone, text(code))
    if not result.ok:
        log.warning("%s OTP SMS to user %s failed: %s", purpose, user.id, result.error)
        raise OtpError("SMS haikutumwa. Bonyeza 'Tuma tena'. / The SMS could not be sent. Press 'Resend'.", 502)


def send_signup_otp(db: Session, user: User, *, public: bool = False) -> None:
    """Texts the signup verification code. Raises OtpError if it cannot."""
    _send_code(
        db, user,
        lambda c: f"{settings.APP_NAME}: Msimbo wa kuthibitisha usajili ni {c} (dakika {settings.OTP_TTL_MINUTES}). Usiutoe kwa mtu asiyekusajili.",
        public=public, model=PhoneOtp, purpose="signup",
    )


def send_reset_otp(db: Session, user: User) -> None:
    """Texts the 'forgot password' code (always counts as a public request). Raises OtpError if it cannot."""
    _send_code(
        db, user,
        lambda c: f"{settings.APP_NAME}: Msimbo wako wa kubadili password ni {c}. Ni halali kwa dakika {settings.OTP_TTL_MINUTES} tu.",
        public=True, model=PasswordResetOtp, purpose="reset",
    )


def consume_code(db: Session, user: User, code: str, *, model=PhoneOtp, purpose: str = "signup") -> None:
    """Checks `code` against the user's pending code. On success the code is used up and the caller
    must commit (after doing whatever the code was for). Wrong guesses are counted and committed here."""
    code = (code or "").strip()
    row = db.scalar(select(model).where(model.user_id == user.id).with_for_update())
    if row is None or row.code_hash is None:
        raise OtpError(WRONG_CODE)

    expires = _aware(row.expires_at)
    if expires is None or expires < _now():
        row.code_hash = None
        db.commit()
        raise OtpError(WRONG_CODE)

    if row.attempts >= settings.OTP_MAX_ATTEMPTS:
        row.code_hash = None
        db.commit()
        raise OtpError("Umejaribu mara nyingi. Omba msimbo mpya. / Too many tries. Ask for a new code.", 429)

    row.attempts += 1
    if not hmac.compare_digest(row.code_hash, _hash_code(user.id, code, purpose)):
        if row.attempts >= settings.OTP_MAX_ATTEMPTS:
            row.code_hash = None  # this code is burnt; a new one is needed
        db.commit()
        raise OtpError(WRONG_CODE)

    row.code_hash, row.expires_at = None, None  # used up


def verify_code(db: Session, user: User, code: str) -> None:
    """Marks the user's phone as verified if `code` is right. Raises OtpError otherwise."""
    consume_code(db, user, code, model=PhoneOtp, purpose="signup")
    user.phone_verified = True
    db.commit()


def check_reset_code(db: Session, user: User, code: str) -> None:
    """Accepts the 'forgot password' code (the caller sets the new password and commits). Raises OtpError otherwise."""
    consume_code(db, user, code, model=PasswordResetOtp, purpose="reset")

"""phone_otps table - the one-time code that proves a new customer owns their phone number.

One row per user. The code itself is never stored, only a keyed hash of it, so reading the
database does not reveal a valid code. The counters keep working across re-registrations, which
is what stops someone from bypassing the per-phone SMS limit by registering the same number again."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PhoneOtp(Base):
    __tablename__ = "phone_otps"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    code_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # None = no valid code right now
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    attempts: Mapped[int] = mapped_column(default=0)  # wrong guesses against the CURRENT code
    window_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sends_in_window: Mapped[int] = mapped_column(default=0)  # codes sent in the current hour
    last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

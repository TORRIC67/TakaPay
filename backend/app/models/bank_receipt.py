"""bank_receipts table - a customer paid into the company bank account and uploaded proof.

An admin looks at the uploaded image/PDF and either approves it (which creates a normal completed
Payment, so the customer becomes 'paid' and joins the collection list) or rejects it with a reason.
The file itself is kept in the database so it survives redeploys on hosts with a temporary disk."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReceiptStatus:
    PENDING = "pending"    # waiting for an admin
    APPROVED = "approved"  # verified, payment recorded
    REJECTED = "rejected"  # not accepted (see reject_reason); the customer may upload again


class BankReceipt(Base):
    __tablename__ = "bank_receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    provider_id: Mapped[Optional[int]] = mapped_column(ForeignKey("providers.id"), nullable=True, index=True)
    billing_period: Mapped[str] = mapped_column(String(7), index=True)  # e.g. "2026-10"
    amount_claimed: Mapped[int]  # what the customer SAYS they paid; the admin confirms the real figure
    reference: Mapped[Optional[str]] = mapped_column(String(60), nullable=True, index=True)  # bank transaction no.

    file_name: Mapped[str] = mapped_column(String(120))
    content_type: Mapped[str] = mapped_column(String(40))  # detected from the file bytes, not from the browser
    file_sha256: Mapped[str] = mapped_column(String(64), index=True)  # same file twice = same receipt reused
    # deferred: lists of receipts must not drag every image out of the database
    file_data: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)

    status: Mapped[str] = mapped_column(String(10), default=ReceiptStatus.PENDING, index=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    amount_received: Mapped[Optional[int]] = mapped_column(nullable=True)  # confirmed by the admin on approval
    payment_order_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    reviewed_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

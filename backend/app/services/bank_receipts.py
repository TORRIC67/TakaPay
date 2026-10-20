"""Bank-transfer payments: the customer pays into the company account, uploads the receipt, and an
admin checks it. Approval records a normal completed Payment, so from then on everything behaves
exactly as if the customer had paid by mobile money (paid status + added to the collection list)."""
import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.bank_receipt import BankReceipt, ReceiptStatus
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.user import User
from app.payments.base import PaymentStatus
from app.payments.service import on_payment_completed


class ReceiptError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------- file checks
def sniff_type(data: bytes) -> Optional[str]:
    """What the bytes really are. The browser's claimed type is ignored on purpose: this is
    user-uploaded content that admins will open, so only plain images and PDFs are accepted."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:5] == b"%PDF-":
        return "application/pdf"
    return None


def _safe_name(name: Optional[str]) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]", "_", (name or "receipt").split("/")[-1].split("\\")[-1])
    return (base.strip("._") or "receipt")[:120]


# ---------------------------------------------------------------- customer side
def has_pending_receipt(db: Session, customer_id: int, period: str) -> bool:
    return db.scalar(
        select(BankReceipt.id).where(
            BankReceipt.customer_id == customer_id,
            BankReceipt.billing_period == period,
            BankReceipt.status == ReceiptStatus.PENDING,
        )
    ) is not None


def save_receipt(
    db: Session, customer: Customer, *, period: str, amount_claimed: int,
    reference: Optional[str], filename: Optional[str], data: bytes,
) -> BankReceipt:
    if not data:
        raise ReceiptError("Faili ni tupu. / The file is empty.")
    if len(data) > settings.RECEIPT_MAX_MB * 1024 * 1024:
        raise ReceiptError(
            f"Faili ni kubwa sana (juu ya MB {settings.RECEIPT_MAX_MB}). / File is too large (over {settings.RECEIPT_MAX_MB} MB).", 413
        )
    content_type = sniff_type(data)
    if content_type is None:
        raise ReceiptError("Pakia picha (JPG, PNG, WEBP) au PDF tu. / Upload an image (JPG, PNG, WEBP) or a PDF only.", 400)

    reference = (reference or "").strip()[:60] or None

    # same period: one receipt at a time
    if has_pending_receipt(db, customer.id, period):
        raise ReceiptError(
            "Una risiti inasubiri uthibitisho kwa mwezi huu. / You already have a receipt waiting for review for this month.", 423
        )

    # a daily cap so nobody floods the review queue
    since = datetime.now(timezone.utc) - timedelta(days=1)
    recent = db.scalar(
        select(func.count(BankReceipt.id)).where(BankReceipt.customer_id == customer.id, BankReceipt.created_at >= since)
    )
    if recent >= settings.RECEIPT_MAX_UPLOADS_PER_DAY:
        raise ReceiptError("Umefikia kikomo cha risiti kwa leo. / Daily receipt upload limit reached.", 429)

    digest = hashlib.sha256(data).hexdigest()
    live = (ReceiptStatus.PENDING, ReceiptStatus.APPROVED)  # a rejected receipt may be corrected and sent again
    if db.scalar(select(BankReceipt.id).where(BankReceipt.file_sha256 == digest, BankReceipt.status.in_(live))):
        raise ReceiptError("Risiti hii tayari imeshapakiwa. / This receipt has already been uploaded.", 409)
    if reference and db.scalar(
        select(BankReceipt.id).where(
            func.lower(BankReceipt.reference) == reference.lower(), BankReceipt.status.in_(live)
        )
    ):
        raise ReceiptError("Namba hii ya muamala tayari imetumika. / This transaction number was already used.", 409)

    receipt = BankReceipt(
        customer_id=customer.id, provider_id=customer.provider_id, billing_period=period,
        amount_claimed=amount_claimed, reference=reference, file_name=_safe_name(filename),
        content_type=content_type, file_sha256=digest, file_data=data, status=ReceiptStatus.PENDING,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt


# ---------------------------------------------------------------- admin side
def _load_pending(db: Session, receipt_id: int, scope: Optional[int]) -> BankReceipt:
    receipt = db.scalar(select(BankReceipt).where(BankReceipt.id == receipt_id).with_for_update())
    customer = db.get(Customer, receipt.customer_id) if receipt else None
    if receipt is None or (scope is not None and customer.provider_id != scope):
        raise ReceiptError("Receipt not found", 404)
    if receipt.status != ReceiptStatus.PENDING:
        raise ReceiptError("Risiti hii tayari imeshughulikiwa. / This receipt was already reviewed.", 409)
    return receipt


def _bank_payment(receipt: BankReceipt, customer: Customer, *, suffix: str, period: str, amount: int, purpose: str) -> Payment:
    return Payment(
        customer_id=customer.id, provider_id=customer.provider_id, provider="bank", method="bank",
        order_id=f"BANK-{receipt.id}{suffix}", phone=customer.phone, billing_period=period,
        amount=amount, fee=0, net_amount=amount, purpose=purpose,
        status=PaymentStatus.COMPLETED.value, completed_at=datetime.now(timezone.utc),
    )


def approve_receipt(db: Session, receipt_id: int, reviewer: User, amount_received: int, scope: Optional[int]) -> BankReceipt:
    """The admin saw the money in the bank statement. `amount_received` is the real figure.
      * it must cover the customer's monthly fee, otherwise the admin should reject the receipt
      * anything above the fee is added to the customer's wallet
      * if the month was already paid some other way, the whole amount goes to the wallet instead"""
    receipt = _load_pending(db, receipt_id, scope)
    customer = db.get(Customer, receipt.customer_id)
    fee = customer.effective_fee_tzs

    already_paid = db.scalar(
        select(Payment.id).where(
            Payment.customer_id == customer.id, Payment.billing_period == receipt.billing_period,
            Payment.purpose == "monthly_bill", Payment.status == PaymentStatus.COMPLETED.value,
        )
    ) is not None

    if already_paid:
        bill_part, wallet_part = 0, amount_received
    elif amount_received < fee:
        raise ReceiptError(
            f"Kiasi (TZS {amount_received:,}) ni chini ya ada ya mwezi (TZS {fee:,}). Kataa risiti au andika kiasi sahihi. / "
            f"Amount is below the monthly fee (TZS {fee:,}). Reject the receipt or enter the right amount.", 400
        )
    else:
        bill_part, wallet_part = fee, amount_received - fee

    if bill_part:
        bill = _bank_payment(receipt, customer, suffix="", period=receipt.billing_period, amount=bill_part, purpose="monthly_bill")
        db.add(bill)
        db.flush()
        on_payment_completed(db, bill)  # paid status + collection list, in this same transaction
        receipt.payment_order_id = bill.order_id
    if wallet_part:
        topup = _bank_payment(receipt, customer, suffix="-W", period="WALLET", amount=wallet_part, purpose="wallet_topup")
        db.add(topup)
        db.flush()
        on_payment_completed(db, topup)  # credits the wallet
        receipt.payment_order_id = receipt.payment_order_id or topup.order_id

    receipt.status = ReceiptStatus.APPROVED
    receipt.amount_received = amount_received
    receipt.reviewed_by_user_id, receipt.reviewed_at = reviewer.id, datetime.now(timezone.utc)
    db.commit()
    db.refresh(receipt)
    return receipt


def reject_receipt(db: Session, receipt_id: int, reviewer: User, reason: str, scope: Optional[int]) -> BankReceipt:
    receipt = _load_pending(db, receipt_id, scope)
    receipt.status = ReceiptStatus.REJECTED
    receipt.reject_reason = reason.strip()[:300]
    receipt.reviewed_by_user_id, receipt.reviewed_at = reviewer.id, datetime.now(timezone.utc)
    db.commit()
    db.refresh(receipt)
    return receipt

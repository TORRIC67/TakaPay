"""Payment endpoints.

  POST /payments/collect                 resident (self) or admin -> sends USSD push
  POST /payments/wallet/topup            resident (self) or admin -> add money to wallet
  POST /payments/wallet/pay-bill         resident (self) or admin -> pay this month from wallet
  GET  /payments/methods                 which ways to pay are available (push is always there)
  POST /payments/qr                      resident (self) or admin -> creates a QR code to scan
  POST /payments/bank-receipt            resident (self) or admin -> upload proof of a bank transfer
  GET  /payments/bank-receipts/mine      resident -> my uploaded receipts and their review status
  POST /payments/webhooks/harakapay      called by HarakaPay only (secret token in URL)
  GET  /payments/balance                 admin only -> HarakaPay wallet/float
  POST /payments/reconcile               admin only -> re-check all pending payments
  GET  /payments/{order_id}              resident (own) or admin -> current status
"""
import hmac
import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

# Adjust these imports to match your project:
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.phone import validate_tz_mobile
from app.models.bank_receipt import BankReceipt
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.provider import ServiceProvider
from app.models.user import Role
from app.models.webhook_log import WebhookLog
from app.payments.base import PaymentProvider, PaymentProviderError
from app.payments.harakapay import HarakaPayProvider
from app.payments.mock import MockProvider
from app.payments.service import (
    AlreadyPaidError,
    InsufficientWalletError,
    PaymentNotFoundError,
    pay_bill_from_wallet,
    reconcile_pending,
    start_payment,
    start_qr_payment,
    start_wallet_topup,
    sync_payment,
)
from app.schemas import BankReceiptOut, PaymentHistoryOut
from app.services.bank_receipts import ReceiptError, has_pending_receipt, save_receipt
from app.services.billing import today_tz
from app.services.receipts import build_receipt_pdf

log = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


@lru_cache
def get_provider() -> PaymentProvider:
    # Cached so we reuse one HTTP client. PAYMENT_PROVIDER=mock swaps in the fake provider (dev only).
    if settings.PAYMENT_PROVIDER == "mock":
        return MockProvider()
    return HarakaPayProvider(settings.HARAKAPAY_API_KEY, settings.HARAKAPAY_BASE_URL)


class CollectRequest(BaseModel):
    customer_id: int
    # "YYYY-MM"; defaults to the current month. Amount is NOT accepted from the client.
    billing_period: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    # Pay from a DIFFERENT phone just for this one payment (e.g. paying from a relative's
    # line). This never changes the customer's account/login phone - use the admin's
    # "edit customer" screen for that instead.
    phone: Optional[str] = None


class WalletTopupRequest(BaseModel):
    customer_id: int
    amount: int = Field(ge=1000)  # a trivially small top-up isn't worth a mobile-money fee


class PayFromWalletRequest(BaseModel):
    customer_id: int
    billing_period: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}$")


class PaymentOut(BaseModel):
    order_id: str
    status: str
    amount: int
    billing_period: str
    customer_id: int

    class Config:
        from_attributes = True


def _can_access(user, customer: Customer) -> bool:
    """Super admin: everyone. Regular admin: only their own zone's customers. Resident: only their own record."""
    if user.role == Role.SUPER_ADMIN:
        return True
    if user.role == Role.ADMIN:
        return customer.provider_id == user.provider_id
    return user.role == "resident" and customer.user_id == user.id


def _history_cutoff() -> datetime:
    """First moment of the oldest month a customer may still see (UTC)."""
    today = today_tz()
    months_back = max(settings.CUSTOMER_HISTORY_MONTHS, 1) - 1
    y, m = today.year, today.month - months_back
    while m < 1:
        m += 12
        y -= 1
    return datetime(y, m, 1, tzinfo=timezone.utc)


def _ensure_verified(customer: Customer) -> None:
    """A customer who has not entered their OTP is not registered yet, so nothing can be paid for them."""
    if not customer.user.phone_verified:
        raise HTTPException(
            400, "Namba ya simu ya mteja haijathibitishwa (OTP). / The customer's phone number is not verified (OTP) yet."
        )


def _ensure_no_pending_receipt(db: Session, customer_id: int, period: str) -> None:
    """While a bank receipt for this month waits for review, other payments for it are blocked, so
    the customer cannot end up paying twice. 423 (not 409): the payment button treats 409 as 'already paid'."""
    if has_pending_receipt(db, customer_id, period):
        raise HTTPException(
            423, "Una risiti ya benki inasubiri uthibitisho kwa mwezi huu. Subiri ijibiwe kabla ya kulipa tena. / "
                 "A bank receipt for this month is waiting for review. Wait for it before paying again."
        )


@router.post("/collect", response_model=PaymentOut)
def collect(
    body: CollectRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    provider: PaymentProvider = Depends(get_provider),
):
    customer = db.get(Customer, body.customer_id)
    if customer is None:
        raise HTTPException(404, "Customer not found")
    if not _can_access(user, customer):
        raise HTTPException(403, "Not allowed")
    _ensure_verified(customer)

    period = body.billing_period or datetime.now().strftime("%Y-%m")
    _ensure_no_pending_receipt(db, customer.id, period)
    pay_phone = customer.phone
    if body.phone:
        try:
            pay_phone = validate_tz_mobile(body.phone)
        except ValueError as exc:
            raise HTTPException(400, str(exc))
    try:
        return start_payment(
            db,
            provider,
            customer_id=customer.id,
            phone=pay_phone,
            amount=customer.effective_fee_tzs,  # fixed server-side so nobody can pay less (their own custom fee if they have one)
            billing_period=period,
            webhook_url=settings.HARAKAPAY_WEBHOOK_URL,
            provider_id=customer.provider_id,
        )
    except AlreadyPaidError:
        raise HTTPException(409, "Already paid for this period")
    except PaymentProviderError as exc:
        log.warning("HarakaPay collect failed: %s", exc)
        raise HTTPException(502, f"Payment provider error: {exc}")


@router.post("/wallet/topup", response_model=PaymentOut)
def wallet_topup(
    body: WalletTopupRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    provider: PaymentProvider = Depends(get_provider),
):
    """Sends a USSD push for the customer to add money to their Smart Taka wallet."""
    customer = db.get(Customer, body.customer_id)
    if customer is None:
        raise HTTPException(404, "Customer not found")
    if not _can_access(user, customer):
        raise HTTPException(403, "Not allowed")
    _ensure_verified(customer)
    try:
        return start_wallet_topup(
            db, provider, customer_id=customer.id, phone=customer.phone, amount=body.amount,
            webhook_url=settings.HARAKAPAY_WEBHOOK_URL, provider_id=customer.provider_id,
        )
    except PaymentProviderError as exc:
        raise HTTPException(502, f"Payment provider error: {exc}")


@router.post("/wallet/pay-bill", response_model=PaymentOut)
def wallet_pay_bill(body: PayFromWalletRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pays this month's bill instantly from the customer's wallet balance - no phone approval needed."""
    customer = db.get(Customer, body.customer_id)
    if customer is None:
        raise HTTPException(404, "Customer not found")
    if not _can_access(user, customer):
        raise HTTPException(403, "Not allowed")
    _ensure_verified(customer)
    period = body.billing_period or datetime.now().strftime("%Y-%m")
    _ensure_no_pending_receipt(db, customer.id, period)
    try:
        return pay_bill_from_wallet(db, customer=customer, billing_period=period, fee_amount=customer.effective_fee_tzs)
    except AlreadyPaidError:
        raise HTTPException(409, "Already paid for this period")
    except InsufficientWalletError:
        raise HTTPException(400, "Wallet balance is not enough for this bill")


@router.get("/wallet")
def my_wallet(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != Role.RESIDENT:
        raise HTTPException(403, "Residents only")
    customer = db.scalar(select(Customer).where(Customer.user_id == user.id))
    if customer is None:
        raise HTTPException(404, "No customer profile for this user")
    return {"wallet_balance_tzs": customer.wallet_balance_tzs}


@router.post("/webhooks/harakapay")
def harakapay_webhook(
    payload: dict = Body(...),
    token: str = Query(default=""),
    db: Session = Depends(get_db),
    provider: PaymentProvider = Depends(get_provider),
):
    # Save exactly what arrived BEFORE doing anything else with it - if processing fails
    # below (or the token check fails), this row still shows what HarakaPay actually sent.
    order_id = payload.get("order_id")
    entry = WebhookLog(source="harakapay", order_id=str(order_id) if order_id else None, raw_payload=json.dumps(payload)[:8000])
    db.add(entry)
    db.commit()

    # HarakaPay docs mention no signature, so the URL carries a secret token instead.
    if not hmac.compare_digest(token, settings.HARAKAPAY_WEBHOOK_TOKEN):
        entry.error = "invalid webhook token"
        db.commit()
        raise HTTPException(403, "Forbidden")

    if order_id:
        try:
            # The body is only a hint. sync_payment re-checks the real status with HarakaPay.
            sync_payment(db, provider, str(order_id))
            entry.processed = True
        except PaymentNotFoundError:
            entry.error = f"unknown order_id {order_id}"
            log.warning("Webhook for unknown order_id %s", order_id)
        except Exception as exc:
            # Still answer 200 (HarakaPay only wants a 200); reconcile_pending will retry it.
            entry.error = str(exc)[:2000]
            log.exception("Webhook processing failed for %s", order_id)
    else:
        entry.error = "no order_id in payload"
    db.commit()
    return {"ok": True}


@router.get("/balance")
def balance(user=Depends(get_current_user), provider: HarakaPayProvider = Depends(get_provider)):
    if user.role not in Role.ADMINS:
        raise HTTPException(403, "Admin only")
    try:
        return provider.get_balance()
    except PaymentProviderError as exc:
        raise HTTPException(502, str(exc))


@router.post("/reconcile")
def reconcile(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    provider: PaymentProvider = Depends(get_provider),
):
    if user.role not in Role.ADMINS:
        raise HTTPException(403, "Admin only")
    return {"updated": reconcile_pending(db, provider)}


class QrRequest(BaseModel):
    customer_id: int
    billing_period: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}$")


class QrPaymentOut(PaymentOut):
    qr_data: Optional[str] = None  # the text to draw as a QR code


@router.get("/methods")
def payment_methods(user=Depends(get_current_user), provider: PaymentProvider = Depends(get_provider)):
    """Which ways of paying the screen should offer. Mobile-money push is always there. The QR
    option appears only when the active payment provider can really issue QR codes. The bank
    option appears only when a company account number is configured (BANK_ACCOUNT_NUMBER)."""
    number = settings.BANK_ACCOUNT_NUMBER.strip()
    bank = None
    if number:
        bank = {
            "account_number": number,
            "bank_name": settings.BANK_NAME.strip() or None,
            "account_name": settings.BANK_ACCOUNT_NAME.strip() or None,
        }
    return {"push": True, "qr": bool(provider.supports_qr), "bank": bank}


@router.post("/qr", response_model=QrPaymentOut)
def qr_payment(
    body: QrRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    provider: PaymentProvider = Depends(get_provider),
):
    """Creates (or re-shows) a QR code for this month's bill. The amount is fixed server-side."""
    customer = db.get(Customer, body.customer_id)
    if customer is None:
        raise HTTPException(404, "Customer not found")
    if not _can_access(user, customer):
        raise HTTPException(403, "Not allowed")
    _ensure_verified(customer)
    if not provider.supports_qr:
        raise HTTPException(501, "Malipo ya QR bado hayajawashwa. / QR payments are not enabled yet.")

    period = body.billing_period or datetime.now().strftime("%Y-%m")
    _ensure_no_pending_receipt(db, customer.id, period)
    try:
        return start_qr_payment(
            db, provider, customer_id=customer.id, phone=customer.phone, amount=customer.effective_fee_tzs,
            billing_period=period, webhook_url=settings.HARAKAPAY_WEBHOOK_URL, provider_id=customer.provider_id,
        )
    except AlreadyPaidError:
        raise HTTPException(409, "Already paid for this period")
    except PaymentProviderError as exc:
        log.warning("QR creation failed: %s", exc)
        raise HTTPException(502, f"Payment provider error: {exc}")


@router.post("/bank-receipt", response_model=BankReceiptOut, status_code=201)
def upload_bank_receipt(
    customer_id: int = Form(...),
    amount: int = Form(..., ge=1, le=100_000_000),  # what the customer says they paid; an admin confirms it
    reference: Optional[str] = Form(default=None, max_length=60),  # bank transaction number, optional
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """The customer paid into the company bank account and uploads the receipt (image or PDF).
    It waits for an admin to verify it against the bank statement. Always for the CURRENT month."""
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(404, "Customer not found")
    if not _can_access(user, customer):
        raise HTTPException(403, "Not allowed")
    _ensure_verified(customer)

    period = today_tz().strftime("%Y-%m")
    paid = db.scalar(
        select(Payment.id).where(
            Payment.customer_id == customer.id, Payment.billing_period == period,
            Payment.purpose == "monthly_bill", Payment.status == "completed",
        )
    )
    if paid:
        raise HTTPException(409, "Already paid for this period")

    data = file.file.read(settings.RECEIPT_MAX_MB * 1024 * 1024 + 1)  # one byte over the limit is enough to know it is too big
    try:
        return save_receipt(
            db, customer, period=period, amount_claimed=amount, reference=reference,
            filename=file.filename, data=data,
        )
    except ReceiptError as exc:
        raise HTTPException(exc.status, str(exc))


@router.get("/bank-receipts/mine", response_model=list[BankReceiptOut])
def my_bank_receipts(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """The logged-in resident's uploaded receipts, newest first, with their review status."""
    if user.role != Role.RESIDENT:
        raise HTTPException(403, "Residents only")
    customer = db.scalar(select(Customer).where(Customer.user_id == user.id))
    if customer is None:
        raise HTTPException(404, "No customer profile for this user")
    return db.scalars(
        select(BankReceipt).where(BankReceipt.customer_id == customer.id).order_by(BankReceipt.id.desc()).limit(20)
    ).all()


@router.get("/mine", response_model=list[PaymentHistoryOut])
def my_payments(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """The logged-in resident's own payment history (for the 'Payment history' screen)."""
    if user.role != Role.RESIDENT:
        raise HTTPException(403, "Residents only")
    customer = db.scalar(select(Customer).where(Customer.user_id == user.id))
    if customer is None:
        raise HTTPException(404, "No customer profile for this user")
    # Rolling window: this month plus the previous (N-1) months. The oldest month drops off the
    # customer's screen when a new one starts. Nothing is deleted - admins and reports still see it all.
    return db.scalars(
        select(Payment)
        .where(Payment.customer_id == customer.id, Payment.created_at >= _history_cutoff())
        .order_by(Payment.created_at.desc())
    ).all()


@router.get("/{order_id}/receipt")
def download_receipt(order_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """A PDF receipt for one completed payment - the customer downloads their own;
    an admin can also pull one up (e.g. if the customer lost theirs)."""
    payment = db.scalar(select(Payment).where(Payment.order_id == order_id))
    if payment is None:
        raise HTTPException(404, "Payment not found")
    customer = db.get(Customer, payment.customer_id)
    if not _can_access(user, customer):
        raise HTTPException(403, "Not allowed")
    if payment.status != "completed":
        raise HTTPException(400, "This payment has not completed yet, so there is no receipt")

    provider_name = settings.APP_NAME
    if customer.provider_id:
        zone = db.get(ServiceProvider, customer.provider_id)
        if zone:
            provider_name = zone.name
    pdf_bytes = build_receipt_pdf(payment, customer, provider_name)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="receipt-{order_id}.pdf"'},
    )


@router.get("/{order_id}", response_model=PaymentOut)
def payment_status(
    order_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    provider: PaymentProvider = Depends(get_provider),
):
    """Frontend polls this every few seconds while the customer approves on their phone."""
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if payment is None:
        raise HTTPException(404, "Payment not found")
    customer = db.get(Customer, payment.customer_id)
    if not _can_access(user, customer):
        raise HTTPException(403, "Not allowed")

    try:
        return sync_payment(db, provider, order_id)  # no-op if already final
    except PaymentProviderError:
        return payment  # provider hiccup: just show what we have

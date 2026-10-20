"""Admin: review the bank-transfer receipts that customers uploaded.

  GET  /admin/receipts?status=pending     the queue (default: everything, newest first), only the admin's own zone
  GET  /admin/receipts/{id}/file          the uploaded image / PDF
  POST /admin/receipts/{id}/approve       the money is in the bank -> records the payment
  POST /admin/receipts/{id}/reject        not accepted, with a reason the customer will see
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_scope, require_roles
from app.models.bank_receipt import BankReceipt
from app.models.customer import Customer
from app.models.user import Role, User
from app.schemas import ReceiptApprove, ReceiptReject
from app.services.bank_receipts import ReceiptError, approve_receipt, reject_receipt

router = APIRouter(prefix="/admin/receipts", tags=["receipts"], dependencies=[Depends(require_roles(*Role.ADMINS))])


def _row(r: BankReceipt, c: Customer) -> dict:
    return {
        "id": r.id, "customer_id": c.id, "customer_name": c.full_name, "phone": c.phone, "ward": c.ward,
        "billing_period": r.billing_period, "expected_fee_tzs": c.effective_fee_tzs,
        "amount_claimed": r.amount_claimed, "reference": r.reference, "status": r.status,
        "reject_reason": r.reject_reason, "amount_received": r.amount_received,
        "content_type": r.content_type, "created_at": r.created_at, "reviewed_at": r.reviewed_at,
    }


@router.get("")
def list_receipts(
    status: Optional[str] = None,  # pending | approved | rejected
    scope: Optional[int] = Depends(get_optional_scope),
    db: Session = Depends(get_db),
):
    q = select(BankReceipt, Customer).join(Customer, Customer.id == BankReceipt.customer_id)
    if scope is not None:
        q = q.where(Customer.provider_id == scope)
    if status:
        q = q.where(BankReceipt.status == status)
    rows = db.execute(q.order_by(BankReceipt.id.desc()).limit(300)).all()
    return [_row(r, c) for r, c in rows]


@router.get("/{receipt_id}/file")
def receipt_file(receipt_id: int, scope: Optional[int] = Depends(get_optional_scope), db: Session = Depends(get_db)):
    receipt = db.get(BankReceipt, receipt_id)
    customer = db.get(Customer, receipt.customer_id) if receipt else None
    if receipt is None or (scope is not None and customer.provider_id != scope):
        raise HTTPException(404, "Receipt not found")
    return Response(
        content=receipt.file_data,
        media_type=receipt.content_type,  # detected from the bytes when it was uploaded
        headers={
            "Content-Disposition": f'inline; filename="{receipt.file_name}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@router.post("/{receipt_id}/approve")
def approve(
    receipt_id: int, body: ReceiptApprove,
    user: User = Depends(require_roles(*Role.ADMINS)),
    scope: Optional[int] = Depends(get_optional_scope),
    db: Session = Depends(get_db),
):
    try:
        r = approve_receipt(db, receipt_id, user, body.amount_received, scope)
    except ReceiptError as exc:
        db.rollback()
        raise HTTPException(exc.status, str(exc))
    return _row(r, db.get(Customer, r.customer_id))


@router.post("/{receipt_id}/reject")
def reject(
    receipt_id: int, body: ReceiptReject,
    user: User = Depends(require_roles(*Role.ADMINS)),
    scope: Optional[int] = Depends(get_optional_scope),
    db: Session = Depends(get_db),
):
    try:
        r = reject_receipt(db, receipt_id, user, body.reason, scope)
    except ReceiptError as exc:
        db.rollback()
        raise HTTPException(exc.status, str(exc))
    return _row(r, db.get(Customer, r.customer_id))

// src/api/payments.js
// The HarakaPay API key is NEVER here - it lives only on the backend.
import { get, post, request } from "./client";

// Sends the USSD push to the customer's phone. The amount is decided by the server.
// altPhone: pay from a DIFFERENT phone just this once (doesn't change the account's phone).
export const collectPayment = (customerId, billingPeriod, altPhone) =>
  post("/payments/collect", { customer_id: customerId, billing_period: billingPeriod, phone: altPhone || undefined });

export const topUpWallet = (customerId, amount) => post("/payments/wallet/topup", { customer_id: customerId, amount });
export const payBillFromWallet = (customerId, billingPeriod) =>
  post("/payments/wallet/pay-bill", { customer_id: customerId, billing_period: billingPeriod });
export const getWallet = () => get("/payments/wallet");

// "pending" | "completed" | "failed" | "needs_review"
export const getPaymentStatus = (orderId) => get(`/payments/${encodeURIComponent(orderId)}`);

// Which ways to pay are available: { push, qr, bank: {account_number, bank_name, account_name} | null }
export const getPaymentMethods = () => get("/payments/methods");

// Creates (or re-shows) a QR code for this month's bill. Returns { order_id, status, amount, qr_data, ... }
export const createQrPayment = (customerId) => post("/payments/qr", { customer_id: customerId });

// Bank transfer: upload the receipt (image or PDF). The amount is what the customer says they paid.
export const uploadBankReceipt = (customerId, amount, reference, file) => {
  const form = new FormData();
  form.append("customer_id", String(customerId));
  form.append("amount", String(amount));
  if (reference) form.append("reference", reference);
  form.append("file", file);
  return request("/payments/bank-receipt", { method: "POST", body: form });
};
export const getMyBankReceipts = () => get("/payments/bank-receipts/mine");

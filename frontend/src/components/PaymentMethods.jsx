// src/components/PaymentMethods.jsx
//
// The three ways a customer can pay, shown inside the green card on their dashboard:
//   1. Phone (push)  - the existing "Make payment" button (to their own number or another one)
//   2. QR code       - scan with a phone wallet or a bank app (only offered when the payment provider can issue one)
//   3. Bank account  - pay into the company account, then upload the receipt for an admin to verify
//
// Props:
//   customer     the logged-in customer
//   fee          this customer's monthly fee in TZS
//   onPaid       called when a payment completes (refreshes the dashboard)
//   pushContent  the existing push-payment buttons, shown unchanged on the first tab
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Landmark, QrCode, Smartphone, Upload } from "lucide-react";
import { createQrPayment, getMyBankReceipts, getPaymentMethods, getPaymentStatus, uploadBankReceipt } from "../api/payments";
import { useI18n } from "../useI18n";

const POLL_MS = 4000;
const QR_MAX_POLLS = 90; // about 6 minutes: scanning in a bank app can take longer than a PIN prompt
const MAX_FILE_MB = 5;   // matches RECEIPT_MAX_MB on the server (the server is the one that enforces it)

// ---------------------------------------------------------------- QR
function QrPanel({ customer, fee, onPaid }) {
  const { t } = useI18n();
  const [state, setState] = useState("idle"); // idle | creating | showing | paid | timeout | failed | error
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; clearTimeout(timerRef.current); };
  }, []);

  function poll(orderId, attempt = 1) {
    timerRef.current = setTimeout(async () => {
      try {
        const p = await getPaymentStatus(orderId);
        if (!aliveRef.current) return;
        if (p.status === "completed") { setState("paid"); onPaid?.(); return; }
        if (p.status === "failed") { setState("failed"); return; }
        if (p.status === "needs_review") { setError(t("pay_review")); setState("error"); return; }
      } catch { /* network hiccup: try again on the next tick */ }
      if (!aliveRef.current) return;
      if (attempt >= QR_MAX_POLLS) { setState("timeout"); return; }
      poll(orderId, attempt + 1);
    }, POLL_MS);
  }

  async function generate() {
    setState("creating");
    setError("");
    try {
      const p = await createQrPayment(customer.id);
      if (!aliveRef.current) return;
      setQr(p);
      setState("showing");
      poll(p.order_id);
    } catch (e) {
      if (!aliveRef.current) return;
      if (e.status === 409) { setState("paid"); onPaid?.(); return; } // already paid this month
      setError(e.message);
      setState("error");
    }
  }

  return (
    <div className="pay-panel">
      <p className="pay-panel-title"><QrCode size={15} /> {t("qr_title")}</p>
      {(state === "idle" || state === "failed" || state === "error" || state === "timeout") && (
        <>
          <p className="pay-hint">{t("qr_hint", { amount: Number(fee).toLocaleString() })}</p>
          <button type="button" className="pay-btn" onClick={generate}>
            {state === "idle" ? t("qr_generate_btn") : t("qr_regenerate_btn")}
          </button>
          {state === "failed" && <p className="pay-msg bad">{t("pay_failed")}</p>}
          {state === "timeout" && <p className="pay-msg">{t("pay_timeout")}</p>}
          {state === "error" && <p className="pay-msg bad">{error}</p>}
        </>
      )}
      {state === "creating" && <p className="pay-hint">{t("pay_sending")}</p>}
      {state === "showing" && qr && (
        <>
          <div className="pay-qr-box"><QRCodeSVG value={qr.qr_data} size={200} /></div>
          <p className="pay-hint">TZS {Number(qr.amount).toLocaleString()} - {t("qr_scan_hint")}</p>
          <p className="pay-hint">{t("qr_waiting")}</p>
        </>
      )}
      {state === "paid" && <p className="pay-msg">{t("pay_paid")}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- bank account + receipt upload
const RECEIPT_STATUS = {
  pending: "receipt_status_pending",
  approved: "receipt_status_approved",
  rejected: "receipt_status_rejected",
};

function BankPanel({ customer, fee, bank, receipts, reloadReceipts, onPaid }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(String(fee));
  const [reference, setReference] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const hasPending = receipts.some((r) => r.status === "pending");

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(bank.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked: the number is on screen anyway */ }
  }

  function pickFile(e) {
    const f = e.target.files?.[0] || null;
    setMsg(null);
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      e.target.value = "";
      setMsg({ ok: false, text: t("receipt_too_big", { mb: MAX_FILE_MB }) });
      return;
    }
    setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      await uploadBankReceipt(customer.id, Number(amount), reference.trim(), file);
      setMsg({ ok: true, text: t("receipt_uploaded") });
      setFile(null);
      setReference("");
      if (fileRef.current) fileRef.current.value = "";
      await reloadReceipts();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function checkAgain() {
    await reloadReceipts();
    onPaid?.(); // refresh the dashboard: an approved receipt turns the status to "paid"
  }

  return (
    <div className="pay-panel">
      <p className="pay-panel-title"><Landmark size={15} /> {t("bank_title")}</p>
      <div className="pay-bank">
        {bank.bank_name && <div><span>{t("bank_name_label")}</span><b>{bank.bank_name}</b></div>}
        {bank.account_name && <div><span>{t("bank_account_name_label")}</span><b>{bank.account_name}</b></div>}
        <div>
          <span>{t("bank_account_number_label")}</span>
          <b className="pay-bank-number">{bank.account_number}</b>
          <button type="button" className="pay-copy" onClick={copyNumber} aria-label={t("bank_copy_btn")}>
            {copied ? <><Check size={14} /> {t("bank_copied")}</> : <><Copy size={14} /> {t("bank_copy_btn")}</>}
          </button>
        </div>
      </div>
      <p className="pay-hint">{t("bank_amount_hint", { amount: Number(fee).toLocaleString() })} {t("bank_upload_hint")}</p>

      {hasPending ? (
        <p className="pay-msg">{t("receipt_pending_banner")}</p>
      ) : (
        <form className="pay-form" onSubmit={submit}>
          <label>{t("receipt_amount_label")}
            <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>{t("receipt_reference_label")}
            <input type="text" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <label>{t("receipt_file_label")}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pickFile} required />
          </label>
          <button className="pay-btn" disabled={busy || !file}><Upload size={14} /> {busy ? t("receipt_uploading") : t("receipt_submit_btn")}</button>
        </form>
      )}
      {msg && <p className={`pay-msg ${msg.ok ? "" : "bad"}`}>{msg.text}</p>}

      {receipts.length > 0 && (
        <div className="pay-receipts">
          <div className="pay-receipts-head">
            <span>{t("receipts_mine_title")}</span>
            <button type="button" className="pay-copy" onClick={checkAgain}>{t("pay_recheck")}</button>
          </div>
          {receipts.slice(0, 4).map((r) => (
            <div key={r.id} className="pay-receipt-row">
              <span>{r.billing_period} - TZS {Number(r.amount_claimed).toLocaleString()}</span>
              <span className={`pay-chip ${r.status}`}>{t(RECEIPT_STATUS[r.status] || r.status)}</span>
              {r.status === "rejected" && r.reject_reason && <small>{t("receipt_reason", { reason: r.reject_reason })}</small>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the tabs
export default function PaymentMethods({ customer, fee, onPaid, pushContent }) {
  const { t } = useI18n();
  const [methods, setMethods] = useState(null);
  const [tab, setTab] = useState("push");
  const [receipts, setReceipts] = useState([]);

  const reloadReceipts = useCallback(() => getMyBankReceipts().then(setReceipts).catch(() => {}), []);

  useEffect(() => {
    getPaymentMethods().then(setMethods).catch(() => setMethods({ push: true, qr: false, bank: null }));
    reloadReceipts();
  }, [reloadReceipts]);

  const tabs = [
    { id: "push", label: t("pay_method_push"), icon: <Smartphone size={15} /> },
    ...(methods?.qr ? [{ id: "qr", label: t("pay_method_qr"), icon: <QrCode size={15} /> }] : []),
    ...(methods?.bank ? [{ id: "bank", label: t("pay_method_bank"), icon: <Landmark size={15} /> }] : []),
  ];
  const active = tabs.some((x) => x.id === tab) ? tab : "push";

  return (
    <div className="pay-methods">
      {tabs.length > 1 && (
        <div className="pay-tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={active === x.id}
                    className={`pay-tab ${active === x.id ? "active" : ""}`} onClick={() => setTab(x.id)}>
              {x.icon} {x.label}
            </button>
          ))}
        </div>
      )}
      {active === "push" && (
        <>
          {tabs.length > 1 && <p className="pay-hint">{t("pay_push_hint", { phone: customer.phone })}</p>}
          {pushContent}
        </>
      )}
      {active === "qr" && <QrPanel customer={customer} fee={fee} onPaid={onPaid} />}
      {active === "bank" && methods?.bank && (
        <BankPanel customer={customer} fee={fee} bank={methods.bank} receipts={receipts} reloadReceipts={reloadReceipts} onPaid={onPaid} />
      )}
    </div>
  );
}

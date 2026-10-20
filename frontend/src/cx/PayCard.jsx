// "Choose how to pay": three ways, each with its own panel.
//   Mobile Money - a payment request is pushed to the customer's phone (to their own number or another one)
//   QR Code      - scan with a wallet or bank app (offered only when the payment provider can issue QR codes)
//   Bank         - pay into the company account, then upload the receipt for an admin to verify
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { collectPayment, createQrPayment, getMyBankReceipts, getPaymentMethods, getPaymentStatus, payBillFromWallet, uploadBankReceipt } from "../api/payments";
import { useI18n } from "../useI18n";
import { I } from "./Icon.jsx";
import { NETWORKS } from "./networks.js";
import { currentPeriodLabel, formatAccount, formatPhone, money, nextPeriodLabel } from "./format.js";

const POLL_MS = 4000;
const PUSH_MAX_POLLS = 45; // about 3 minutes, then "check again"
const QR_MAX_POLLS = 90;   // about 6 minutes: scanning in a bank app can take longer
const MAX_FILE_MB = 5;     // the server enforces the real limit; this just saves a wasted upload

// ---------------------------------------------------------------- shared: poll a payment until it is final
function usePolling() {
  const timer = useRef(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(timer.current); }; }, []);
  const poll = useCallback((orderId, max, onStatus, onGiveUp, attempt = 1) => {
    timer.current = setTimeout(async () => {
      try {
        const p = await getPaymentStatus(orderId);
        if (!alive.current) return;
        if (onStatus(p.status)) return; // true = final, stop
      } catch { /* network hiccup: try again on the next tick */ }
      if (!alive.current) return;
      if (attempt >= max) { onGiveUp(); return; }
      poll(orderId, max, onStatus, onGiveUp, attempt + 1);
    }, POLL_MS);
  }, []);
  return { poll, alive };
}

// ---------------------------------------------------------------- Mobile Money panel
function PushPane({ customer, fee, walletBalance, onPaid, onToast }) {
  const { t } = useI18n();
  const [state, setState] = useState("idle"); // idle | sending | waiting | paid | failed | review | timeout | error
  const [error, setError] = useState("");
  const [alt, setAlt] = useState(false);
  const [altPhone, setAltPhone] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const orderRef = useRef(null);
  const { poll, alive } = usePolling();

  const watch = (orderId) => poll(
    orderId, PUSH_MAX_POLLS,
    (s) => {
      if (s === "completed") { setState("paid"); onPaid?.(); return true; }
      if (s === "failed") { setState("failed"); return true; }
      if (s === "needs_review") { setState("review"); return true; }
      return false;
    },
    () => setState("timeout"),
  );

  async function pay() {
    setState("sending");
    setError("");
    try {
      const p = await collectPayment(customer.id, undefined, alt ? altPhone : undefined);
      if (!alive.current) return;
      orderRef.current = p.order_id;
      setState("waiting");
      watch(p.order_id);
    } catch (e) {
      if (!alive.current) return;
      if (e.status === 409) { setState("paid"); onPaid?.(); return; } // already paid this month
      setError(e.message);
      setState("error");
    }
  }

  async function payWallet() {
    setWalletBusy(true);
    try {
      await payBillFromWallet(customer.id);
      onToast?.({ ok: true, text: t("paid_from_wallet_success") });
      onPaid?.();
    } catch (e) {
      onToast?.({ ok: false, text: e.message });
    } finally {
      setWalletBusy(false);
    }
  }

  const busy = state === "sending" || state === "waiting";
  const stepNow = { sending: 1, waiting: 2, paid: 3 }[state] || 0;
  const canWallet = walletBalance !== null && walletBalance >= fee;

  return (
    <div className="cx-pane">
      <div className="cx-lbl">
        <span>{t("cx_mobile_number")}</span>
        <button type="button" onClick={() => { setAlt((a) => !a); setAltPhone(""); }} disabled={busy}>{alt ? t("cx_use_registered") : t("cx_pay_other")}</button>
      </div>
      <div className="cx-field">
        <span className="cc"><Flag />{alt ? "+255" : ""}</span>
        {alt
          ? <input type="tel" inputMode="tel" placeholder="0754 123 456" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} aria-label={t("cx_mobile_number")} autoFocus />
          : <input value={formatPhone(customer.phone).replace("+255 ", "")} readOnly aria-label={t("cx_mobile_number")} />}
        {!alt && <span className="ok"><I n="check" size={16} />{t("cx_registered")}</span>}
      </div>

      <div className="cx-break">
        <div><span>{t("cx_break_sub")}</span><b>TZS {money(fee)}</b></div>
        <div><span>{t("cx_break_fee")}</span><b>TZS 0</b></div>
        <div className="tot"><span>{t("cx_break_total")}</span><b>TZS {money(fee)}</b></div>
      </div>

      <button type="button" className="cx-btn" onClick={pay} disabled={busy || (alt && !altPhone.trim())}>
        {busy ? <><span className="cx-spin" />{state === "sending" ? t("pay_sending") : t("cx_confirm_phone")}</>
          : <>{t("cx_pay_btn", { amount: money(fee) })}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></>}
      </button>
      {canWallet && (
        <button type="button" className="cx-btn ghost block sm" onClick={payWallet} disabled={walletBusy || busy}>
          <I n="wallet" size={17} />{t("cx_wallet_pay", { amount: money(fee) })}
        </button>
      )}

      {state === "waiting" && <p className="cx-msg">{t("pay_waiting")}</p>}
      {state === "failed" && <p className="cx-msg bad">{t("pay_failed")}</p>}
      {state === "review" && <p className="cx-msg bad">{t("pay_review")}</p>}
      {state === "error" && <p className="cx-msg bad">{error}</p>}
      {state === "timeout" && (<><p className="cx-msg">{t("pay_timeout")}</p><button type="button" className="cx-linkbtn" onClick={() => { setState("waiting"); watch(orderRef.current); }}>{t("pay_recheck")}</button></>)}

      <ol className="cx-steps">
        <li className={stepNow === 1 ? "now" : ""}><i>1</i><span>{t("cx_step1")}<small>{t("cx_step1s")}</small></span></li>
        <li className={stepNow === 2 ? "now" : ""}><i>2</i><span>{t("cx_step2")}<small>{t("cx_step2s")}</small></span></li>
        <li className={stepNow === 3 ? "now" : ""}><i>3</i><span>{t("cx_step3")}<small>{t("cx_step3s")}</small></span></li>
      </ol>
      <div className="cx-secure">
        <span className="sh"><I n="shield" size={22} /></span>
        <div><b>{t("cx_secure_title")}</b><small>{t("cx_secure_text")}</small></div>
      </div>
    </div>
  );
}

function Flag() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" style={{ borderRadius: 4, flex: "none" }} aria-hidden="true">
      <defs><clipPath id="cx-flag"><rect width="24" height="16" rx="3" /></clipPath></defs>
      <g clipPath="url(#cx-flag)"><rect width="24" height="16" fill="#1EB53A" /><polygon points="24,0 24,16 0,16" fill="#00A3DD" /><polygon points="0,12.6 24,-3.4 24,3.4 0,19.4" fill="#FCD116" /><polygon points="0,13.8 24,-2.2 24,2.2 0,18.2" fill="#000" /></g>
    </svg>
  );
}

// ---------------------------------------------------------------- QR panel
function QrPane({ customer, fee, onPaid }) {
  const { t } = useI18n();
  const [state, setState] = useState("idle"); // idle | creating | showing | paid | timeout | failed | error
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");
  const { poll, alive } = usePolling();

  async function generate() {
    setState("creating");
    setError("");
    try {
      const p = await createQrPayment(customer.id);
      if (!alive.current) return;
      setQr(p);
      setState("showing");
      poll(p.order_id, QR_MAX_POLLS,
        (s) => { if (s === "completed") { setState("paid"); onPaid?.(); return true; } if (s === "failed") { setState("failed"); return true; } return false; },
        () => setState("timeout"));
    } catch (e) {
      if (!alive.current) return;
      if (e.status === 409) { setState("paid"); onPaid?.(); return; }
      setError(e.message);
      setState("error");
    }
  }

  const again = state === "failed" || state === "error" || state === "timeout";
  return (
    <div className="cx-pane">
      <div className="cx-qrbox">
        {state === "showing" && qr ? (
          <>
            <div className="cx-qr-frame"><i className="corner c1" /><i className="corner c2" /><i className="corner c3" /><i className="corner c4" /><QRCodeSVG value={qr.qr_data} size={196} /></div>
            <div><h3>{t("cx_qr_scan_pay", { amount: money(qr.amount) })}</h3><p>{t("qr_scan_hint")}</p></div>
            <span className="cx-due"><I n="clock" size={15} />{t("qr_waiting")}</span>
          </>
        ) : (
          <>
            <div className="cx-qr-ph"><I n="qr" size={64} style={{ strokeWidth: 1.2 }} /></div>
            <div><h3>{t("qr_title")}</h3><p>{t("qr_hint", { amount: money(fee) })}</p></div>
            {(state === "idle" || again) && (
              <button type="button" className="cx-btn" style={{ marginTop: 0 }} onClick={generate}>{state === "idle" ? t("qr_generate_btn") : t("qr_regenerate_btn")}</button>
            )}
            {state === "creating" && <p className="cx-msg"><span className="cx-spin" style={{ display: "inline-block", verticalAlign: -4, marginRight: 8, borderColor: "rgba(134,239,172,.3)", borderTopColor: "#86efac" }} />{t("pay_sending")}</p>}
            {state === "failed" && <p className="cx-msg bad">{t("pay_failed")}</p>}
            {state === "timeout" && <p className="cx-msg">{t("pay_timeout")}</p>}
            {state === "error" && <p className="cx-msg bad">{error}</p>}
          </>
        )}
        {state === "paid" && <p className="cx-msg">{t("pay_paid")}</p>}
      </div>
      <div className="cx-secure">
        <span className="sh"><I n="shield" size={22} /></span>
        <div><b>{t("cx_qr_secure_title")}</b><small>{t("cx_qr_secure_text")}</small></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Bank panel
const RECEIPT_STATUS = { pending: ["receipt_status_pending", "wait"], approved: ["receipt_status_approved", "ok"], rejected: ["receipt_status_rejected", "bad"] };

function BankPane({ customer, fee, bank, receipts, reloadReceipts, onPaid }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(String(fee));
  const [reference, setReference] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const hasPending = receipts.some((r) => r.status === "pending");

  async function copy() {
    try { await navigator.clipboard.writeText(bank.account_number); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: the number is on screen */ }
  }
  function take(f) {
    setMsg(null);
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) { setFile(null); setMsg({ ok: false, text: t("receipt_too_big", { mb: MAX_FILE_MB }) }); return; }
    setFile(f || null);
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
      await reloadReceipts();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cx-pane">
      <div className="cx-bank">
        <div className="cx-brow">
          <div><small>{t("bank_name_label")}</small><br /><b>{bank.bank_name || "-"}</b></div>
          <div style={{ textAlign: "right" }}><small>{t("bank_account_name_label")}</small><br /><b>{bank.account_name || "-"}</b></div>
        </div>
        <div className="cx-brow">
          <div><small>{t("bank_account_number_label")}</small><span className="acc">{formatAccount(bank.account_number)}</span></div>
          <button type="button" className="cx-copy" onClick={copy}>{copied ? <><I n="check" size={14} />{t("bank_copied")}</> : <><I n="copy" size={14} />{t("bank_copy_btn")}</>}</button>
        </div>
      </div>
      <p className="cx-msg" style={{ color: "var(--muted)", fontWeight: 400 }}>{t("bank_amount_hint", { amount: money(fee) })} {t("bank_upload_hint")}</p>

      {hasPending ? (
        <div className="cx-secure"><span className="sh"><I n="clock" size={22} /></span><div><b>{t("receipt_status_pending")}</b><small>{t("receipt_pending_banner")}</small></div></div>
      ) : (
        <form onSubmit={submit}>
          <div className="cx-two">
            <div><div className="cx-lbl">{t("receipt_amount_label")}</div><div className="cx-field"><input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required /></div></div>
            <div><div className="cx-lbl">{t("receipt_reference_label")}</div><div className="cx-field"><input type="text" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} /></div></div>
          </div>
          <label className={`cx-drop ${over ? "over" : ""}`}
                 onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                 onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}>
            <span className="up"><I n="upload" size={22} /></span>
            <b>{file ? file.name : <>{t("cx_drop_receipt")} <span>{t("cx_browse")}</span></>}</b>
            <small>{t("cx_drop_hint", { mb: MAX_FILE_MB })}</small>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => take(e.target.files?.[0])} />
          </label>
          <button className="cx-btn" disabled={busy || !file}>
            {busy ? <><span className="cx-spin" />{t("receipt_uploading")}</> : <>{t("receipt_submit_btn")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></>}
          </button>
        </form>
      )}
      {msg && <p className={`cx-msg ${msg.ok ? "" : "bad"}`}>{msg.text}</p>}

      {receipts.length > 0 && (
        <div className="cx-receipts">
          <div className="cx-receipts-h"><span>{t("receipts_mine_title")}</span><button type="button" onClick={async () => { await reloadReceipts(); onPaid?.(); }}>{t("pay_recheck")}</button></div>
          {receipts.slice(0, 4).map((r) => {
            const [key, tone] = RECEIPT_STATUS[r.status] || [r.status, ""];
            return (
              <div key={r.id} className="cx-rrow">
                <span>{r.billing_period} · TZS {money(r.amount_claimed)}</span>
                <span className={`cx-chip ${tone}`}>{t(key)}</span>
                {r.status === "rejected" && r.reject_reason && <small>{t("receipt_reason", { reason: r.reject_reason })}</small>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the card
export default function PayCard({ customer, fee, walletBalance, onPaid, onToast }) {
  const { t, lang } = useI18n();
  const paid = customer.payment_status === "paid";
  const [methods, setMethods] = useState(null); // {push, qr, bank}
  const [pane, setPane] = useState("mm");
  const [receipts, setReceipts] = useState([]);
  const reloadReceipts = useCallback(() => getMyBankReceipts().then(setReceipts).catch(() => {}), []);

  useEffect(() => {
    if (paid) return;
    getPaymentMethods().then(setMethods).catch(() => setMethods({ push: true, qr: false, bank: null }));
    reloadReceipts();
  }, [paid, reloadReceipts]);

  const qrOk = !!methods?.qr;
  const bank = methods?.bank;

  return (
    <section id="cx-pay" className="cx-card cx-pay">
      <div className="cx-sec-h">
        <div><div className="cx-eyebrow">{t("cx_quick_payment")}</div><h2>{paid ? t("cx_paid_title") : t("cx_choose_pay")}</h2></div>
        <span className="cx-due"><I n="clock" size={15} />{t("cx_next_due")} <b>{nextPeriodLabel(lang)}</b></span>
      </div>

      {paid ? (
        <div className="cx-paid">
          <span className="big"><I n="check" size={30} style={{ strokeWidth: 3 }} /></span>
          <h3>{t("cx_paid_title")}</h3>
          <p>{t("cx_paid_text")}</p>
          <div className="cx-break" style={{ width: "100%", maxWidth: 380 }}>
            <div><span>{t("cx_paid_amount")}</span><b>TZS {money(fee)}</b></div>
            <div><span>{t("cx_paid_period")}</span><b>{currentPeriodLabel(lang)}</b></div>
            <div><span>{t("cx_stat_next")}</span><b>{nextPeriodLabel(lang)}</b></div>
          </div>
        </div>
      ) : (
        <>
          <div className="cx-methods" role="tablist">
            <button type="button" role="tab" aria-selected={pane === "mm"} className={`cx-method ${pane === "mm" ? "on" : ""}`} onClick={() => setPane("mm")}>
              <span className="cx-m-ic"><I n="phone" size={26} /></span>
              <span className="cx-m-t"><b>{t("cx_pay_mm")}</b><small>{t("cx_pay_mm_sub")}</small></span>
              <span className="cx-radio"><I n="check" size={12} /></span>
              <span className="cx-nets">
                {NETWORKS.map((n) => (
                  <span key={n.id} className="cx-net" title={n.label} style={n.logo ? { background: "#fff" } : { background: n.bg, color: n.fg }}>
                    {n.logo ? <img src={n.logo} alt={n.label} /> : n.text}
                  </span>
                ))}
              </span>
            </button>

            {methods && (
              <button type="button" role="tab" aria-selected={pane === "qr"} aria-disabled={!qrOk} className={`cx-method ${pane === "qr" && qrOk ? "on" : ""}`} onClick={() => qrOk && setPane("qr")}>
                <span className="cx-m-ic"><I n="qr" size={26} /></span>
                <span className="cx-m-t"><b>{t("pay_method_qr")}</b><small>{t("cx_pay_qr_sub")}</small></span>
                {qrOk ? <span className="cx-radio"><I n="check" size={12} /></span> : <span className="cx-soon">{t("cx_soon")}</span>}
              </button>
            )}

            {bank && (
              <button type="button" role="tab" aria-selected={pane === "bank"} className={`cx-method ${pane === "bank" ? "on" : ""}`} onClick={() => setPane("bank")}>
                <span className="cx-m-ic"><I n="bank" size={26} /></span>
                <span className="cx-m-t"><b>{t("cx_pay_bank_title")}</b><small>{t("cx_pay_bank_sub")}</small></span>
                <span className="cx-radio"><I n="check" size={12} /></span>
                <span className="cx-bankmini">
                  <small>{[bank.bank_name, bank.account_name].filter(Boolean).join(" · ")}</small>
                  <b>{formatAccount(bank.account_number)}</b>
                </span>
              </button>
            )}
          </div>

          {pane === "mm" && <PushPane customer={customer} fee={fee} walletBalance={walletBalance} onPaid={onPaid} onToast={onToast} />}
          {pane === "qr" && qrOk && <QrPane customer={customer} fee={fee} onPaid={onPaid} />}
          {pane === "bank" && bank && <BankPane customer={customer} fee={fee} bank={bank} receipts={receipts} reloadReceipts={reloadReceipts} onPaid={onPaid} />}
        </>
      )}
    </section>
  );
}

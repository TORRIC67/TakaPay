// Wallet balance + "Add funds". Adding funds pushes a payment request to the customer's phone
// for an amount THEY choose (the monthly fee is fixed, this is not). The balance can then pay the bill.
import { useEffect, useRef, useState } from "react";
import { getPaymentStatus, topUpWallet } from "../api/payments";
import { useI18n } from "../useI18n";
import { I } from "./Icon.jsx";
import Modal from "./Modal.jsx";
import { Wallet3D } from "./Art.jsx";
import { money } from "./format.js";

const QUICK = [1000, 2000, 5000, 10000];
const MIN = 1000; // same minimum the old top-up box used

export default function WalletCard({ customer, balance, onDone }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | waiting | done | error
  const [error, setError] = useState("");
  const alive = useRef(true);
  const timer = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(timer.current); }; }, []);

  // Polling lives HERE (not in the popup), so closing the popup does not stop us noticing the payment.
  function poll(orderId, attempt = 1) {
    timer.current = setTimeout(async () => {
      if (!alive.current) return;
      try {
        const p = await getPaymentStatus(orderId);
        if (p.status === "completed") { setState("done"); onDone?.(); return; }
        if (p.status === "failed") { setState("error"); setError(t("pay_failed")); return; }
      } catch { /* keep trying */ }
      if (attempt >= 45) { setState("error"); setError(t("pay_timeout")); return; }
      poll(orderId, attempt + 1);
    }, 4000);
  }

  async function submit(e) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const p = await topUpWallet(customer.id, Number(amount));
      setState("waiting");
      poll(p.order_id);
    } catch (err) {
      setState("error");
      setError(err.message);
    }
  }

  function close() {
    setOpen(false);
    if (state === "done" || state === "error") { setState("idle"); setAmount(""); setError(""); }
  }

  const busy = state === "sending" || state === "waiting";
  const bal = Number(balance ?? 0);

  return (
    <section id="cx-wallet" className="cx-wallet">
      <div className="top"><span className="cx-wlabel">{t("cx_balance")}</span><span className="cx-wtag"><i />{t("cx_wallet_active")}</span></div>
      <div className="cx-bal"><small>TZS</small><b>{money(bal)}</b><span>.00</span></div>
      <p className="cx-wsub">{t("cx_wallet_hint")}</p>
      <button type="button" className="cx-addfunds" onClick={() => setOpen(true)}><i><I n="plus" size={17} style={{ strokeWidth: 2.6 }} /></i>{t("cx_add_funds")}</button>
      <Wallet3D className="cx-wallet3d" />

      {open && (
        <Modal title={t("cx_topup_title")} onClose={close}>
          {state === "done" ? (
            <div className="cx-paid" style={{ marginTop: 0 }}>
              <span className="big"><I n="check" size={30} style={{ strokeWidth: 3 }} /></span>
              <h3>TZS {money(bal)}</h3>
              <p>{t("cx_topup_done")}</p>
              <button type="button" className="cx-btn ghost" onClick={close}>{t("cx_close")}</button>
            </div>
          ) : busy ? (
            <div className="cx-paid" style={{ marginTop: 0 }}>
              <span className="big" style={{ background: "var(--fill3)", boxShadow: "none", color: "var(--gtext)" }}><I n="phone" size={28} /></span>
              <h3>{t("cx_confirm_phone")}</h3>
              <p>{state === "sending" ? t("pay_sending") : t("pay_waiting")}</p>
              <button type="button" className="cx-linkbtn" onClick={close}>{t("cx_topup_bg")}</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="cx-lbl">{t("cx_topup_amount")}</div>
              <div className="cx-chips">
                {QUICK.map((q) => (
                  <button key={q} type="button" className={`cx-chipbtn ${Number(amount) === q ? "on" : ""}`} onClick={() => setAmount(String(q))}>{money(q)}</button>
                ))}
              </div>
              <div className="cx-field">
                <span className="cc">TZS</span>
                <input type="number" min={MIN} step={500} placeholder={t("topup_amount_placeholder")} value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
              </div>
              <button className="cx-btn" disabled={!amount || Number(amount) < MIN}>{t("cx_topup_send")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></button>
              {error && <p className="cx-msg bad">{error}</p>}
              <div className="cx-secure"><span className="sh"><I n="shield" size={22} /></span><div><b>{t("cx_secure_title")}</b><small>{t("cx_secure_text")}</small></div></div>
            </form>
          )}
        </Modal>
      )}
    </section>
  );
}

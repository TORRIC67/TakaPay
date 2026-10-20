// "Recent payments": the customer's last 12 months (the server already limits it). Shows the latest few,
// with Show more / Close for the rest, and a receipt download for completed monthly payments.
import { useState } from "react";
import { downloadFile } from "../api/client";
import { useI18n } from "../useI18n";
import { I } from "./Icon.jsx";
import { dayLabel, money, periodLabel } from "./format.js";

const PREVIEW = 3;
const STATUS = {
  completed: ["cx_status_completed", "ok"],
  pending: ["cx_status_pending", "wait"],
  failed: ["cx_status_failed", "bad"],
  needs_review: ["cx_status_review", "wait"],
};

export default function HistoryCard({ payments, onStart, onToast }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null); // order_id being downloaded

  async function download(orderId) {
    setBusy(orderId);
    try { await downloadFile(`/payments/${orderId}/receipt`, `receipt-${orderId}.pdf`); }
    catch (e) { onToast?.({ ok: false, text: e.message }); }
    finally { setBusy(null); }
  }

  const shown = open ? payments : payments.slice(0, PREVIEW);
  return (
    <section id="cx-history" className="cx-card cx-recent">
      <div className="cx-sec-h">
        <div><div className="cx-eyebrow">{t("cx_activity")}</div><h2>{t("cx_recent_payments")}</h2></div>
      </div>

      {payments.length === 0 ? (
        <div className="cx-empty">
          <div className="art"><span className="halo" /><span className="tile"><I n="receipt" size={34} style={{ strokeWidth: 1.5 }} /></span><span className="clock"><I n="clock" size={15} style={{ strokeWidth: 2.2 }} /></span></div>
          <div className="etxt"><h3>{t("cx_no_history")}</h3><p>{t("cx_no_history_text")}</p></div>
          <button type="button" className="cx-btn ghost" onClick={onStart}>{t("cx_first_payment")}</button>
        </div>
      ) : (
        <>
          <div className={`cx-list ${open ? "cx-scroll" : ""}`}>
            {shown.map((p) => {
              const wallet = p.billing_period === "WALLET";
              const [key, tone] = STATUS[p.status] || [p.status, ""];
              return (
                <div key={p.order_id} className="cx-hrow">
                  <span className={`ic ${wallet ? "wal" : ""}`}><I n={wallet ? "wallet" : "receipt"} size={20} /></span>
                  <div>
                    <b>{wallet ? t("wallet_topup_label") : periodLabel(p.billing_period, lang)}</b>
                    <small>{dayLabel(p.completed_at || p.created_at, lang)}</small>
                  </div>
                  <div className="amt">
                    <b>TZS {money(p.amount)}</b>
                    <span className={`cx-chip ${tone}`}>{t(key)}</span>
                    {p.status === "completed" && !wallet && (
                      <button type="button" className="cx-dl" disabled={busy === p.order_id} onClick={() => download(p.order_id)}>
                        <I n="download" size={14} />{busy === p.order_id ? t("saving") : t("download_receipt_btn")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {payments.length > PREVIEW && (
            <button type="button" className="cx-btn ghost cx-more" onClick={() => setOpen((o) => !o)}>
              {open ? t("history_close_btn") : t("history_more_btn", { n: payments.length - PREVIEW })}
            </button>
          )}
          <p className="cx-note"><I n="info" size={14} />{t("history_window_note")}</p>
        </>
      )}
    </section>
  );
}

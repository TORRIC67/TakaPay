// Emoji rating + "Need help?". Both send to the existing complaints endpoint (rating 1-5 + message),
// so admins see them on the Complaints tab exactly like before.
import { useState } from "react";
import { post } from "../api/client";
import { useI18n } from "../useI18n";
import { I } from "./Icon.jsx";
import Modal from "./Modal.jsx";
import { Face } from "./Art.jsx";

// four faces -> the 1-5 scale the backend stores
const FACES = [
  { k: "excellent", rating: 5, label: "cx_rate_excellent" },
  { k: "good", rating: 4, label: "cx_rate_good" },
  { k: "average", rating: 3, label: "cx_rate_average" },
  { k: "poor", rating: 1, label: "cx_rate_poor" },
];

export function FeedbackForm({ requireMessage = false, onSent }) {
  const { t } = useI18n();
  const [sel, setSel] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const face = FACES.find((f) => f.k === sel);

  async function submit(e) {
    e.preventDefault();
    if (!face) return;
    setBusy(true);
    setErr("");
    try {
      // The backend needs a message; for a quick tap with no comment we send the rating word itself.
      await post("/complaints", { rating: face.rating, message: message.trim() || t(face.label) });
      setSent(true);
      setSel(null);
      setMessage("");
      onSent?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="cx-faces" role="radiogroup">
        {FACES.map((f) => (
          <button key={f.k} type="button" role="radio" aria-checked={sel === f.k} className={`cx-face ${sel === f.k ? "sel" : ""}`} onClick={() => { setSel(f.k); setSent(false); }}>
            <Face kind={f.k} />{t(f.label)}
          </button>
        ))}
      </div>
      {(sel || requireMessage) && (
        <>
          <textarea className="cx-textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required={requireMessage}
                    placeholder={requireMessage ? t("cx_report_msg") : t("cx_fb_comment")} />
          <button className="cx-btn sm" disabled={busy || !face || (requireMessage && !message.trim())}>
            {busy ? <span className="cx-spin" /> : <>{t("cx_fb_send")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></>}
          </button>
        </>
      )}
      {err && <p className="cx-msg bad">{err}</p>}
      {sent && <p className="cx-thanks"><I n="check" size={16} style={{ strokeWidth: 2.6 }} />{t("cx_fb_thanks")}</p>}
    </form>
  );
}

export default function FeedbackCard() {
  const { t } = useI18n();
  return (
    <section className="cx-card cx-fb">
      <div className="cx-eyebrow">{t("cx_your_experience")}</div>
      <h2>{t("cx_how_doing")}</h2>
      <p className="sub">{t("cx_fb_sub")}</p>
      <FeedbackForm />
    </section>
  );
}

export function HelpCard({ onToast }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="cx-card cx-help" onClick={() => setOpen(true)}>
        <span className="hi"><I n="help" size={22} /></span>
        <span><b>{t("cx_help_title")}</b><small>{t("cx_help_sub")}</small></span>
        <span className="go"><I n="arrow" size={17} /></span>
      </button>
      {open && (
        <Modal title={t("cx_report_title")} onClose={() => setOpen(false)}>
          <FeedbackForm requireMessage onSent={() => { setOpen(false); onToast?.({ ok: true, text: t("complaint_thanks") }); }} />
        </Modal>
      )}
    </>
  );
}

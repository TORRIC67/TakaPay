// "Enter the code we texted you" in the themed look. Same behaviour as components/OtpVerify.jsx
// (which the admin / agent screens still use): verify, resend with a 60 s cooldown.
import { useEffect, useState } from "react";
import { post } from "../api/client";
import { useI18n } from "../useI18n";
import { I } from "./Icon.jsx";
import CodeInput from "./CodeInput.jsx";

const COOLDOWN = 60; // matches OTP_RESEND_COOLDOWN_SECONDS on the server

export default function CxOtp({ phone, otpSent = null, otpError = null, onVerified, onCancel }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(otpSent === false ? 0 : COOLDOWN);
  const [msg, setMsg] = useState(otpSent === false ? { ok: false, text: otpError || t("otp_not_sent") } : { ok: true, text: t("otp_sent_to", { phone }) });

  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await post("/auth/verify-phone", { phone, otp_code: code });
      onVerified?.();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setMsg(null);
    try {
      await post("/auth/resend-otp", { phone });
      setCode("");
      setWait(COOLDOWN);
      setMsg({ ok: true, text: t("otp_resent") });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="cx-secure" style={{ marginTop: 0 }}>
        <span className="sh"><I n="shield" size={22} /></span>
        <div><small style={{ fontSize: 12.5, marginTop: 0, color: msg && !msg.ok ? "var(--red)" : "var(--muted)" }}>{msg ? msg.text : ""}</small></div>
      </div>
      <div className="cx-lbl" style={{ marginTop: 20 }}>{t("otp_signup_code_label")}</div>
      <CodeInput value={code} onChange={setCode} label={t("otp_signup_code_label")} disabled={busy} />
      <button className="cx-btn" disabled={busy || code.length !== 6}>
        {busy ? <span className="cx-spin" /> : <>{t("otp_verify_btn")}<span className="arr"><I n="check" size={17} style={{ strokeWidth: 2.6 }} /></span></>}
      </button>
      <div className="cx-auth-row">
        <button type="button" className="cx-linkbtn" style={{ margin: 0 }} disabled={busy || wait > 0} onClick={resend}>
          {wait > 0 ? t("otp_resend_in", { s: wait }) : t("otp_resend_btn")}
        </button>
        {onCancel && <button type="button" className="cx-linkbtn" style={{ margin: 0 }} disabled={busy} onClick={onCancel}>{t("cancel")}</button>}
      </div>
    </form>
  );
}

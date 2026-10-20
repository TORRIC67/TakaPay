// src/components/OtpVerify.jsx
//
// The "enter the code we texted" step. A new customer only counts as registered after this,
// no matter who filled in the registration form (the customer, an admin or a field agent).
//
// Props:
//   phone       the customer's phone number (as returned by the server)
//   otpSent     true/false from the registration answer: did the SMS go out? (null = unknown)
//   otpError    the reason when it did not
//   onVerified  called once the code was accepted
//   onCancel    optional - shows a Cancel button (the account stays unverified; it can be finished later)
import { useEffect, useState } from "react";
import { post } from "../api/client";
import { useI18n } from "../useI18n";

const COOLDOWN = 60; // matches OTP_RESEND_COOLDOWN_SECONDS on the server

export default function OtpVerify({ phone, otpSent = null, otpError = null, onVerified, onCancel }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(otpSent === false ? 0 : COOLDOWN);
  const [msg, setMsg] = useState(
    otpSent === false
      ? { ok: false, text: otpError || t("otp_not_sent") }
      : { ok: true, text: t("otp_sent_to", { phone }) }
  );

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
    <form className="form" onSubmit={submit}>
      <h3 style={{ margin: 0 }}>{t("otp_title")}</h3>
      {msg && <p className={msg.ok ? "ok" : "err"} style={{ margin: 0 }}>{msg.text}</p>}
      <label>{t("otp_signup_code_label")}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          style={{ letterSpacing: "0.3em", fontSize: 20, maxWidth: 180 }}
          required
        />
      </label>
      <div className="row" style={{ margin: 0 }}>
        <button className="btn" disabled={busy || code.length !== 6}>{busy ? t("saving") : t("otp_verify_btn")}</button>
        <button type="button" className="btn ghost" disabled={busy || wait > 0} onClick={resend}>
          {wait > 0 ? t("otp_resend_in", { s: wait }) : t("otp_resend_btn")}
        </button>
        {onCancel && <button type="button" className="btn ghost" disabled={busy} onClick={onCancel}>{t("cancel")}</button>}
      </div>
    </form>
  );
}

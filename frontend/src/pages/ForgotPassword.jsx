import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../cx/AuthShell.jsx";
import CodeInput from "../cx/CodeInput.jsx";
import { Field, PasswordField } from "../cx/Fields.jsx";
import { I } from "../cx/Icon.jsx";
import { post } from "../api/client";
import { useI18n } from "../useI18n";

export default function ForgotPassword() {
  const { t } = useI18n();
  const [step, setStep] = useState(1); // 1 = enter phone, 2 = enter code + new password, 3 = done
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await post("/auth/forgot-password", { phone });
      setMsg({ ok: true, text: t("otp_sent_notice") });
      setStep(2);
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) return setMsg({ ok: false, text: t("passwords_dont_match") });
    setBusy(true);
    try {
      await post("/auth/reset-password", { phone, otp_code: otp, new_password: next });
      setStep(3);
    } catch (err) {
      setMsg({ ok: false, text: err.message });
      setOtp("");
    } finally {
      setBusy(false);
    }
  }

  const footer = <Link to="/login">{t("back_to_login")}</Link>;

  if (step === 3) {
    return (
      <AuthShell solo footer={footer}>
        <div className="cx-paid" style={{ marginTop: 0 }}>
          <span className="big"><I n="check" size={30} style={{ strokeWidth: 3 }} /></span>
          <h3>{t("forgot_password_title")}</h3>
          <p>{t("password_reset_success")}</p>
          <Link className="cx-btn" style={{ textDecoration: "none", marginTop: 14 }} to="/login">{t("cx_go_login")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("forgot_password_title")} subtitle={step === 1 ? t("forgot_password_hint") : t("otp_sent_notice")} footer={footer}>
      {step === 1 ? (
        <form onSubmit={requestCode}>
          <Field label={t("phone_label")} icon="phone" type="tel" inputMode="tel" autoComplete="username" placeholder="0754 123 406" value={phone} onChange={setPhone} required autoFocus />
          {msg && !msg.ok && <p className="cx-msg bad" role="alert">{msg.text}</p>}
          <button className="cx-btn" disabled={busy}>
            {busy ? <span className="cx-spin" /> : <>{t("send_code_btn")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></>}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword}>
          <div className="cx-lbl">{t("otp_signup_code_label")}</div>
          <CodeInput value={otp} onChange={setOtp} label={t("otp_signup_code_label")} disabled={busy} />
          <div style={{ marginTop: 16 }}>
            <PasswordField label={t("new_password_label")} autoComplete="new-password" minLength={8} value={next} onChange={setNext} />
            <PasswordField label={t("confirm_password_label")} autoComplete="new-password" minLength={8} value={confirm} onChange={setConfirm} />
          </div>
          {msg && !msg.ok && <p className="cx-msg bad" role="alert">{msg.text}</p>}
          <button className="cx-btn" disabled={busy || otp.length !== 6}>
            {busy ? <span className="cx-spin" /> : <>{t("reset_password_submit")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></>}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

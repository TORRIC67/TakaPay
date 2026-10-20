import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth.jsx";
import { useI18n } from "../useI18n";
import AuthShell from "../cx/AuthShell.jsx";
import CxOtp from "../cx/CxOtp.jsx";
import { Field, PasswordField } from "../cx/Fields.jsx";
import { I } from "../cx/Icon.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needOtp, setNeedOtp] = useState(false); // right password, but the phone was never verified

  if (user) return <Navigate to={homeFor(user.role)} replace />; // already logged in

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(phone, password);
    } catch (err) {
      if (err.status === 403 && err.message === "PHONE_NOT_VERIFIED") setNeedOtp(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (needOtp) {
    return (
      <AuthShell title={t("otp_title")} subtitle={t("login_unverified_hint")}>
        <CxOtp
          phone={phone}
          onVerified={async () => {
            setNeedOtp(false);
            try { await login(phone, password); } catch (err) { setError(err.message); } // straight in after verifying
          }}
          onCancel={() => setNeedOtp(false)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("cx_login_title")}
      subtitle={t("cx_login_sub")}
      footer={<span>{t("no_account")} <Link to="/register">{t("register_here")}</Link></span>}
    >
      <form onSubmit={submit}>
        <Field label={t("phone_label")} icon="phone" type="tel" inputMode="tel" autoComplete="username" placeholder="0754 123 406" value={phone} onChange={setPhone} required autoFocus />
        <PasswordField label={t("password_label")} value={password} onChange={setPassword} />
        <div className="cx-auth-row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
          <Link className="cx-linkbtn" style={{ margin: 0 }} to="/forgot-password">{t("forgot_password_link")}</Link>
        </div>
        {error && <p className="cx-msg bad" role="alert">{error}</p>}
        <button className="cx-btn" disabled={busy}>
          {busy ? <><span className="cx-spin" />{t("logging_in")}</> : <>{t("login_button")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></>}
        </button>
      </form>
    </AuthShell>
  );
}

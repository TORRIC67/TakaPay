import { useState } from "react";
import { Link } from "react-router-dom";
import { homeFor, useAuth } from "../auth.jsx";
import { post } from "../api/client";
import { useI18n } from "../useI18n";
import AuthShell from "../cx/AuthShell.jsx";
import { PasswordField } from "../cx/Fields.jsx";
import { I } from "../cx/Icon.jsx";

export default function ChangePassword() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null); // {ok, text}
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) return setMsg({ ok: false, text: t("passwords_dont_match") });
    setBusy(true);
    try {
      await post("/auth/change-password", { current_password: current, new_password: next });
      setMsg({ ok: true, text: t("password_changed_success") });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell solo title={t("change_password_title")} footer={user ? <Link to={homeFor(user.role)}>{t("back_to_dashboard")}</Link> : null}>
      <form onSubmit={submit}>
        <PasswordField label={t("current_password_label")} value={current} onChange={setCurrent} />
        <PasswordField label={t("new_password_label")} autoComplete="new-password" minLength={8} value={next} onChange={setNext} />
        <PasswordField label={t("confirm_password_label")} autoComplete="new-password" minLength={8} value={confirm} onChange={setConfirm} />
        {msg && <p className={`cx-msg ${msg.ok ? "" : "bad"}`} role="status">{msg.text}</p>}
        <button className="cx-btn" disabled={busy}>
          {busy ? <span className="cx-spin" /> : <>{t("change_password_submit")}<span className="arr"><I n="check" size={17} style={{ strokeWidth: 2.6 }} /></span></>}
        </button>
      </form>
    </AuthShell>
  );
}

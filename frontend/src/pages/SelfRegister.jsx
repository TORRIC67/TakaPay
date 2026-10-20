import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../cx/AuthShell.jsx";
import CxOtp from "../cx/CxOtp.jsx";
import { Field, PasswordField } from "../cx/Fields.jsx";
import { I } from "../cx/Icon.jsx";
import { get, post } from "../api/client";
import { useI18n } from "../useI18n";

// Optional self-registration for residents (the admin can also register them).
// Needs a zone (Service Provider) picked from the public list - no login required to see it.
// Steps: form -> the OTP texted to the customer's phone -> done. Nobody counts as registered before the OTP.
const EMPTY = { full_name: "", phone: "", password: "", provider_id: "", ward: "", address: "", latitude: "", longitude: "" };

export default function SelfRegister() {
  const { t } = useI18n();
  const [providers, setProviders] = useState([]);
  const [v, setV] = useState(EMPTY);
  const [phase, setPhase] = useState("form"); // form | otp | done
  const [pending, setPending] = useState(null); // the registration answer (phone, otp_sent, otp_error)
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));

  useEffect(() => { get("/providers").then(setProviders).catch((e) => setError(e.message)); }, []);

  // Fill latitude/longitude from the phone's GPS
  function useMyLocation() {
    setError("");
    if (!navigator.geolocation) return setError(t("geo_unsupported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => setV((p) => ({ ...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => setError(t("geo_failed")),
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        full_name: v.full_name, phone: v.phone, password: v.password, ward: v.ward,
        provider_id: Number(v.provider_id), latitude: Number(v.latitude), longitude: Number(v.longitude),
      };
      if (v.address) payload.address = v.address;
      setPending(await post("/auth/register", payload));
      setPhase("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const footer = <span>{t("cx_have_account")} <Link to="/login">{t("cx_login_here")}</Link></span>;

  if (phase === "otp") {
    return (
      <AuthShell title={t("otp_title")} subtitle={t("cx_otp_register_sub")} footer={footer}>
        <CxOtp phone={pending.phone} otpSent={pending.otp_sent} otpError={pending.otp_error} onVerified={() => setPhase("done")} onCancel={() => setPhase("form")} />
      </AuthShell>
    );
  }

  if (phase === "done") {
    return (
      <AuthShell solo>
        <div className="cx-paid" style={{ marginTop: 0 }}>
          <span className="big"><I n="check" size={30} style={{ strokeWidth: 3 }} /></span>
          <h3>{t("cx_registered_title")}</h3>
          <p>{t("registered_verified_success")}</p>
          <Link className="cx-btn" style={{ textDecoration: "none", marginTop: 14 }} to="/login">{t("cx_go_login")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide title={t("register_resident_title")} subtitle={t("register_resident_hint")} footer={footer}>
      <form onSubmit={submit}>
        <div className="cx-section">{t("cx_section_you")}</div>
        <Field label={t("field_customer_name")} icon="user" autoComplete="name" value={v.full_name} onChange={set("full_name")} required />
        <div className="cx-grid2">
          <Field label={t("field_phone")} icon="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0754 123 406" value={v.phone} onChange={set("phone")} required />
          <PasswordField label={t("field_password")} autoComplete="new-password" minLength={8} value={v.password} onChange={set("password")} />
        </div>

        <div className="cx-section">{t("cx_section_place")}</div>
        <Field label={t("field_zone")} icon="pin" value={v.provider_id} onChange={set("provider_id")} required selectPlaceholder={t("field_zone_placeholder")}
               options={providers.map((p) => ({ value: p.id, label: p.name }))} />
        <div className="cx-grid2">
          <Field label={t("field_ward")} icon="pin" value={v.ward} onChange={set("ward")} required />
          <Field label={t("field_address")} icon="pin" value={v.address} onChange={set("address")} />
        </div>
        <div className="cx-grid2 keep">
          <Field label={t("field_latitude")} type="number" step="any" inputMode="decimal" value={v.latitude} onChange={set("latitude")} required />
          <Field label={t("field_longitude")} type="number" step="any" inputMode="decimal" value={v.longitude} onChange={set("longitude")} required />
        </div>
        <button type="button" className="cx-btn ghost block" style={{ marginTop: 4 }} onClick={useMyLocation}><I n="pin" size={17} />{t("use_my_location")}</button>

        {error && <p className="cx-msg bad" role="alert">{error}</p>}
        <button className="cx-btn" disabled={busy}>
          {busy ? <><span className="cx-spin" />{t("saving")}</> : <>{t("register_submit")}<span className="arr"><I n="arrow" size={17} style={{ strokeWidth: 2.4 }} /></span></>}
        </button>
      </form>
    </AuthShell>
  );
}

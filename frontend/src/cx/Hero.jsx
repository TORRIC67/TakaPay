// The top card: welcome, subscription status, monthly fee, and the progress ring.
import { useBrand } from "../brand.jsx";
import { useI18n } from "../useI18n";
import { I } from "./Icon.jsx";
import { Ring } from "./Art.jsx";
import { money, nextPeriodLabel } from "./format.js";

export default function Hero({ user, customer }) {
  const { t, lang } = useI18n();
  const paid = customer.payment_status === "paid";
  const firstName = (user.full_name || "").trim().split(/\s+/)[0];
  const plan = customer.category === "institution" ? t("cx_plan_institution") : t("cx_plan_household");
  const place = [customer.ward, customer.address].filter(Boolean).join(", ");

  return (
    <section id="cx-sub" className="cx-card cx-hero">
      <svg className="rings" viewBox="0 0 520 520" fill="none" aria-hidden="true">
        <circle cx="260" cy="260" r="250" stroke="var(--ring-dots)" />
        <circle cx="260" cy="260" r="205" stroke="var(--ring-dots)" />
        <circle cx="260" cy="260" r="160" stroke="rgba(34,197,94,.18)" />
        <circle cx="260" cy="260" r="250" stroke="rgba(34,197,94,.35)" strokeDasharray="2 14" strokeLinecap="round" />
      </svg>
      <div className="cx-hero-grid">
        <div>
          <span className={`cx-pill ${paid ? "" : "due"}`}><i className="cx-pulse" />{paid ? t("cx_active_sub") : t("cx_payment_due")}</span>
          <h1>{t("cx_welcome_back")}<br /><span className="name">{firstName}</span></h1>
          <p className="cx-lead">{paid ? t("cx_hero_paid") : t("cx_hero_due")}</p>
          {place && <span className="cx-loc"><I n="pin" size={14} />{place}</span>}
          <div className="cx-stats">
            <div className="cx-stat"><small>{t("cx_stat_fee")}</small><b><em>TZS</em>{money(user.monthly_fee_tzs)}</b></div>
            <div className="cx-stat"><small>{t("cx_stat_next")}</small><b>{nextPeriodLabel(lang)}</b></div>
            <div className="cx-stat"><small>{t("cx_stat_plan")}</small><b>{plan}</b></div>
          </div>
        </div>
        <div className="cx-ring-wrap">
          <Ring pct={paid ? 100 : 0} tone={paid ? "ok" : "due"}>
            <b>{paid ? 100 : 0}<sup>%</sup></b>
            <small>{paid ? t("cx_active") : t("cx_due")}</small>
          </Ring>
          <span className={`cx-okpill ${paid ? "" : "due"}`}>
            <i><I n={paid ? "check" : "clock"} size={12} style={{ strokeWidth: 3 }} /></i>
            {paid ? t("cx_sub_active_pill") : t("cx_payment_due")}
          </span>
        </div>
      </div>
    </section>
  );
}

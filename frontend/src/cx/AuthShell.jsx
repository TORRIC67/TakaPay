// The frame for the pages you see BEFORE logging in (login, register, forgot password) and for the
// change-password page: the same dark / light look as the dashboard, brand + language + theme on top.
import { useI18n } from "../useI18n";
import { I, Sprite } from "./Icon.jsx";
import { Wallet3D } from "./Art.jsx";
import { Brand, LangPills } from "./Shell.jsx";
import { useBodyBackground, useTheme } from "./theme.js";
import "./cx.css";

export default function AuthShell({ title, subtitle, wide = false, solo = false, children, footer }) {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  useBodyBackground(theme);

  return (
    <div className="cx" data-theme={theme}>
      <Sprite />
      <div className="cx-bg"><i className="o1" /><i className="o2" /><i className="o3" /></div>
      <div className="cx-auth">
        <header className="cx-auth-top">
          <div className="cx-mbrand" style={{ display: "flex" }}><Brand /></div>
          <div className="cx-top-actions">
            <LangPills />
            <button type="button" className="cx-iconbtn" onClick={toggle} aria-label={theme === "dark" ? t("cx_theme_light") : t("cx_theme_dark")} title={theme === "dark" ? t("cx_theme_light") : t("cx_theme_dark")}>
              <I n={theme === "dark" ? "sun" : "moon"} size={19} />
            </button>
          </div>
        </header>

        <div className={`cx-auth-body ${wide ? "wide" : ""} ${solo ? "solo" : ""}`}>
          {!wide && !solo && (
            <aside className="cx-auth-hero" aria-hidden="true">
              <span className="cx-pill"><i className="cx-pulse" />{t("cx_customer_portal")}</span>
              <h2>{t("cx_auth_headline_1")}<br /><span className="name">{t("cx_auth_headline_2")}</span></h2>
              <p>{t("cx_auth_sub")}</p>
              <div className="cx-auth-chips">
                <span><I n="phone" size={16} />{t("cx_pay_mm")}</span>
                <span><I n="qr" size={16} />{t("pay_method_qr")}</span>
                <span><I n="bank" size={16} />{t("cx_pay_bank_title")}</span>
              </div>
              <Wallet3D className="cx-auth-art" />
            </aside>
          )}
          <main className="cx-card cx-auth-card">
            {title && <h1>{title}</h1>}
            {subtitle && <p className="cx-auth-sub">{subtitle}</p>}
            {children}
          </main>
        </div>
        {footer && <div className="cx-auth-foot">{footer}</div>}
      </div>
    </div>
  );
}

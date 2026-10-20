// The frame around the customer dashboard: sidebar (desktop), top bar, floating tab bar (phone),
// settings popup, and the dark / light switch. Brand name and logo come from brand.jsx.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useBrand } from "../brand.jsx";
import { useI18n } from "../useI18n";
import { I, Sprite } from "./Icon.jsx";
import Modal from "./Modal.jsx";
import { formatPhone } from "./format.js";
import { useBodyBackground, useTheme } from "./theme.js";
import "./cx.css";

// [icon, label key, id of the section it scrolls to]
const NAV = [
  ["dash", "nav_dashboard", "cx-top"],
  ["sub", "nav_subscription", "cx-sub"],
  ["wallet", "nav_wallet", "cx-wallet"],
  ["card", "nav_payments", "cx-pay"],
  ["hist", "nav_history", "cx-history"],
];

export function Brand() {
  const { name, logoUrl, show_name: showName } = useBrand();
  return (
    <>
      {logoUrl ? (
        <span className="cx-logochip"><img src={logoUrl} alt={name} style={{ height: 30 }} /></span>
      ) : (
        <span className="cx-mark"><I n="leaf" size={21} style={{ strokeWidth: 2.1 }} /></span>
      )}
      {(!logoUrl || showName) && <span className="cx-bname">{name}</span>}
    </>
  );
}

export function LangPills() {
  const { lang, setLang, LANGUAGES } = useI18n();
  return (
    <div className="cx-langpills" role="group" aria-label="Language">
      {Object.keys(LANGUAGES).map((code) => (
        <button key={code} type="button" className={lang === code ? "on" : ""} onClick={() => setLang(code)} title={LANGUAGES[code]}>
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { theme, setTheme, toggle } = useTheme();
  const [active, setActive] = useState("dash");
  const [settings, setSettings] = useState(false);
  const customer = user?.customer;

  useBodyBackground(theme);

  const go = useCallback((id) => {
    if (id === "cx-top") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const pick = (icon, id) => { setActive(icon); go(id); };

  useEffect(() => {
    const onScroll = () => { if (window.scrollY < 80) setActive("dash"); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initial = (user?.full_name || "?").trim().charAt(0).toUpperCase();
  const plan = customer?.category === "institution" ? t("cx_plan_institution") : t("cx_plan_household");

  return (
    <div className="cx" data-theme={theme}>
      <Sprite />
      <div className="cx-bg"><i className="o1" /><i className="o2" /><i className="o3" /></div>

      <div className="cx-app">
        {/* ---------- sidebar (desktop) ---------- */}
        <aside className="cx-side">
          <div className="brand"><Brand /></div>
          <div className="cx-navlbl">{t("cx_menu")}</div>
          <nav className="cx-nav">
            {NAV.map(([icon, key, id]) => (
              <button key={icon} type="button" className={active === icon ? "on" : ""} onClick={() => pick(icon, id)}>
                <I n={icon} />{t(key)}
              </button>
            ))}
            <button type="button" onClick={() => setSettings(true)}><I n="set" />{t("nav_settings")}</button>
          </nav>
          <div className="cx-sidefoot">
            <div className="cx-tip"><b>{t("cx_tip_title")}</b><small>{t("cx_tip_text")}</small></div>
            <button type="button" className="cx-me" onClick={() => setSettings(true)}>
              <span className="cx-avatar">{initial}</span>
              <span className="meta"><b>{user?.full_name}</b><small>{plan}</small></span>
            </button>
            <div className="cx-lockline"><I n="lock" size={14} />{t("cx_bank_grade")}</div>
          </div>
        </aside>

        <main className="cx-main" id="cx-top">
          <header className="cx-top">
            <div className="cx-mbrand"><Brand /></div>
            <div className="cx-crumb"><small>{t("cx_overview")}</small><b>{t("nav_dashboard")}</b></div>
            <div className="cx-top-actions">
              <LangPills />
              <button type="button" className="cx-iconbtn" onClick={toggle} aria-label={theme === "dark" ? t("cx_theme_light") : t("cx_theme_dark")} title={theme === "dark" ? t("cx_theme_light") : t("cx_theme_dark")}>
                <I n={theme === "dark" ? "sun" : "moon"} size={19} />
              </button>
              <button type="button" className="cx-profile" onClick={() => setSettings(true)}>
                <span className="cx-avatar">{initial}</span>
                <span className="meta"><b>{user?.full_name}</b><small>{t("cx_customer")}</small></span>
              </button>
            </div>
          </header>

          {children}
        </main>

        {/* ---------- tab bar (phone) ---------- */}
        <nav className="cx-tabbar">
          <button type="button" className={`cx-tab ${active === "dash" ? "on" : ""}`} onClick={() => pick("dash", "cx-top")}><I n="dash" />{t("cx_tab_home")}</button>
          <button type="button" className={`cx-tab ${active === "wallet" ? "on" : ""}`} onClick={() => pick("wallet", "cx-wallet")}><I n="wallet" />{t("nav_wallet")}</button>
          <button type="button" className="cx-tab fab" onClick={() => pick("card", "cx-pay")} aria-label={t("nav_payments")}><span className="f"><I n="card" size={24} style={{ strokeWidth: 2.2 }} /></span><small>{t("nav_payments")}</small></button>
          <button type="button" className={`cx-tab ${active === "hist" ? "on" : ""}`} onClick={() => pick("hist", "cx-history")}><I n="hist" />{t("nav_history")}</button>
          <button type="button" className="cx-tab" onClick={() => setSettings(true)}><I n="set" />{t("nav_settings")}</button>
        </nav>
      </div>

      {settings && (
        <Modal title={t("nav_settings")} onClose={() => setSettings(false)}>
          <div className="cx-acct">
            <span className="cx-avatar">{initial}</span>
            <div><b>{user?.full_name}</b><small>{customer ? `${formatPhone(customer.phone)}${customer.ward ? ` · ${customer.ward}` : ""}` : ""}</small></div>
          </div>
          <div className="cx-set-block">
            <small>{t("cx_language")}</small>
            <LangPills />
          </div>
          <div className="cx-set-block">
            <small>{t("cx_appearance")}</small>
            <div className="cx-seg">
              <button type="button" className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}><I n="moon" size={17} />{t("cx_theme_dark")}</button>
              <button type="button" className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}><I n="sun" size={17} />{t("cx_theme_light")}</button>
            </div>
          </div>
          <div className="cx-set-block cx-menu">
            <Link to="/change-password"><I n="key" size={18} />{t("change_password_link")}</Link>
            <button type="button" className="danger" onClick={logout}><I n="logout" size={18} />{t("logout")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

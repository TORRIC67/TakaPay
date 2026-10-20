// src/brand.jsx
//
// The system name and logo, read from the backend (GET /brand) - so there is ONE place to change them:
//   * name  -> APP_NAME in backend/.env (or Render's Environment)
//   * logo  -> replace the file backend/brand/logo.png (and brand/favicon.png for the tab icon)
// Nothing here needs editing, and the frontend does not have to be rebuilt when they change.
import { createContext, useContext, useEffect, useState } from "react";
import { API } from "./api/client";

const FALLBACK = { name: "Taka Pay", has_logo: false, show_name: true, version: 0 };
const CACHE_KEY = "brand";
const BrandContext = createContext(FALLBACK);

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}

export function BrandProvider({ children }) {
  // Remembered from the last visit so the right name shows instantly; refreshed in the background.
  const [brand, setBrand] = useState(readCache);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/brand`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b) => {
        if (!alive) return;
        setBrand(b);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)); } catch { /* storage blocked: fine */ }
      })
      .catch(() => alive && setBrand((prev) => prev || FALLBACK));
    return () => { alive = false; };
  }, []);

  // Browser tab: title + icon
  useEffect(() => {
    if (!brand) return;
    document.title = brand.name;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = brand.has_logo ? `${API}/brand/favicon?v=${brand.version}` : "data:,";
  }, [brand]);

  // Only the very first visit ever (nothing cached) waits a moment for the real name,
  // so another company's customers never see a different company's name flash by.
  if (!brand) return null;

  const value = { ...brand, logoUrl: brand.has_logo ? `${API}/brand/logo?v=${brand.version}` : null };
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);

// Logo (on a white chip so any logo colour is readable on the green/dark bars) + the name.
// size: height of the logo in px. dark=false means the surrounding background is light (login page).
export function BrandMark({ size = 30, chip = true, nameStyle, fallbackIcon = null }) {
  const { name, logoUrl, show_name: showName } = useBrand();
  const img = logoUrl && (
    <img src={logoUrl} alt={name} style={{ height: size, display: "block", width: "auto" }} />
  );
  return (
    <span className="brand-mark">
      {img && (chip ? <span className="brand-logo-chip">{img}</span> : img)}
      {!logoUrl && fallbackIcon}
      {(!logoUrl || showName) && <span style={nameStyle}>{name}</span>}
    </span>
  );
}

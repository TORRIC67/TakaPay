// Dark / light mode for the customer screens. The choice is remembered on this device.
import { useCallback, useEffect, useState } from "react";

const KEY = "cx-theme";

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, theme); } catch { /* storage blocked: the choice just won't be remembered */ }
  }, [theme]);
  const setTheme = useCallback((v) => setThemeState(v === "light" ? "light" : "dark"), []);
  const toggle = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, setTheme, toggle };
}

// The page behind the full-screen themed area must match it, or overscroll flashes the old colour.
export function useBodyBackground(theme) {
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = theme === "dark" ? "#020617" : "#EEF3F9";
    return () => { document.body.style.background = prev; };
  }, [theme]);
}

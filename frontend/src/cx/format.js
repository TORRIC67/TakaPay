// Small display helpers for the customer screens.
export const money = (n) => Number(n || 0).toLocaleString();

// "0712345678" (how numbers are stored) -> "+255 712 345 678"
export function formatPhone(p) {
  const d = String(p || "").replace(/\D/g, "");
  const local = d.startsWith("255") ? d.slice(3) : d.replace(/^0/, "");
  return local.length === 9 ? `+255 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : String(p || "");
}

// "31410034454" -> "3141 0034 454" (groups of four, easier to read and to copy by eye)
export const formatAccount = (n) => String(n || "").replace(/\s/g, "").replace(/(.{4})(?=.)/g, "$1 ");

const LOCALES = { sw: "sw-TZ", en: "en-GB", fr: "fr-FR" };
const loc = (lang) => LOCALES[lang] || "en-GB";

// First month of the next billing period, e.g. "Nov 2026"
export function nextPeriodLabel(lang) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(loc(lang), { month: "short", year: "numeric" });
}

// "2026-10" -> "Oct 2026"; anything else is returned as it came
export function periodLabel(period, lang) {
  const m = /^(\d{4})-(\d{2})$/.exec(period || "");
  if (!m) return period;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(loc(lang), { month: "short", year: "numeric" });
}

export const dayLabel = (iso, lang) => (iso ? new Date(iso).toLocaleDateString(loc(lang), { day: "numeric", month: "short", year: "numeric" }) : "");

// This month, e.g. "Oct 2026"
export const currentPeriodLabel = (lang) => new Date().toLocaleDateString(loc(lang), { month: "short", year: "numeric" });

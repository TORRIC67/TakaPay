// Illustrations: the 3D wallet, the four feedback faces and the progress ring.
// Gradient ids are prefixed (cxw-, cxf-, cxr-) so they never clash with other SVGs on the page.

export function Wallet3D({ className }) {
  return (
    <svg className={className} viewBox="0 0 300 250" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cxw-body" x1="40" y1="90" x2="260" y2="210" gradientUnits="userSpaceOnUse"><stop stopColor="#5eead4" /><stop offset=".38" stopColor="#22C55E" /><stop offset="1" stopColor="#0ea5e9" /></linearGradient>
        <linearGradient id="cxw-side" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0f9d58" /><stop offset="1" stopColor="#0b4f7a" /></linearGradient>
        <linearGradient id="cxw-flap" x1="0" y1="80" x2="0" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#ffffff" stopOpacity=".42" /><stop offset="1" stopColor="#ffffff" stopOpacity=".04" /></linearGradient>
        <linearGradient id="cxw-clasp" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1e293b" /><stop offset="1" stopColor="#020617" /></linearGradient>
        <linearGradient id="cxw-cardb" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#93c5fd" /><stop offset=".5" stopColor="#3B82F6" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
        <linearGradient id="cxw-cardg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bbf7d0" /><stop offset=".5" stopColor="#22C55E" /><stop offset="1" stopColor="#15803d" /></linearGradient>
        <linearGradient id="cxw-coin" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9f99d" /><stop offset="1" stopColor="#4ade80" /></linearGradient>
        <radialGradient id="cxw-glow" cx=".5" cy=".5" r=".5"><stop stopColor="#34d399" stopOpacity=".55" /><stop offset="1" stopColor="#34d399" stopOpacity="0" /></radialGradient>
        <filter id="cxw-blur"><feGaussianBlur stdDeviation="8" /></filter>
      </defs>
      <ellipse cx="150" cy="130" rx="140" ry="100" fill="url(#cxw-glow)" />
      <ellipse cx="148" cy="226" rx="104" ry="13" fill="#000" opacity=".5" filter="url(#cxw-blur)" />
      <g transform="rotate(-15 150 90)"><rect x="66" y="26" width="150" height="98" rx="15" fill="url(#cxw-cardb)" /><rect x="66" y="26" width="150" height="98" rx="15" stroke="#fff" strokeOpacity=".35" /><rect x="84" y="46" width="26" height="19" rx="5" fill="#fff" fillOpacity=".55" /><rect x="84" y="82" width="64" height="5" rx="2.5" fill="#fff" fillOpacity=".5" /><rect x="84" y="94" width="38" height="5" rx="2.5" fill="#fff" fillOpacity=".32" /></g>
      <g transform="rotate(-3 160 80)"><rect x="96" y="38" width="150" height="98" rx="15" fill="url(#cxw-cardg)" /><rect x="96" y="38" width="150" height="98" rx="15" stroke="#fff" strokeOpacity=".45" /><circle cx="214" cy="60" r="11" fill="#fff" fillOpacity=".35" /><circle cx="226" cy="60" r="11" fill="#fff" fillOpacity=".22" /><rect x="112" y="98" width="70" height="5" rx="2.5" fill="#fff" fillOpacity=".6" /></g>
      <rect x="40" y="96" width="212" height="124" rx="28" fill="url(#cxw-side)" />
      <rect x="40" y="84" width="212" height="124" rx="28" fill="url(#cxw-body)" />
      <rect x="40.5" y="84.5" width="211" height="123" rx="27.5" stroke="#fff" strokeOpacity=".5" />
      <path d="M40 114a30 30 0 0 1 30-30h152a30 30 0 0 1 30 30v26c-30 10-70 14-106 14s-76-4-106-14z" fill="url(#cxw-flap)" />
      <path d="M52 112a20 20 0 0 1 20-20h148a20 20 0 0 1 20 20" stroke="#fff" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="54" y="98" width="184" height="96" rx="20" stroke="#fff" strokeOpacity=".38" strokeDasharray="4 6" strokeLinecap="round" />
      <rect x="196" y="124" width="76" height="50" rx="16" fill="url(#cxw-clasp)" />
      <rect x="196.5" y="124.5" width="75" height="49" rx="15.5" stroke="#fff" strokeOpacity=".22" />
      <circle cx="232" cy="149" r="12" fill="#22C55E" /><circle cx="232" cy="149" r="12" stroke="#bbf7d0" strokeOpacity=".8" /><circle cx="232" cy="149" r="4.5" fill="#052e16" />
      <circle cx="232" cy="149" r="22" fill="#22C55E" opacity=".25" filter="url(#cxw-blur)" />
      <g transform="translate(52 40)">
        <path d="M0 30v12a28 9 0 0 0 56 0V30" fill="#16a34a" /><path d="M0 30v12a28 9 0 0 0 56 0V30" stroke="#fff" strokeOpacity=".25" />
        <ellipse cx="28" cy="30" rx="28" ry="9" fill="url(#cxw-coin)" /><ellipse cx="28" cy="30" rx="20" ry="5.6" stroke="#15803d" strokeOpacity=".55" />
        <ellipse cx="28" cy="27.5" rx="10" ry="2.6" fill="#fff" fillOpacity=".55" />
      </g>
      <path d="M262 52l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#fff" opacity=".95" />
      <path d="M24 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#bbf7d0" />
      <path d="M276 150l1.6 4.6 4.6 1.6-4.6 1.6-1.6 4.6-1.6-4.6-4.6-1.6 4.6-1.6z" fill="#fff" opacity=".8" />
    </svg>
  );
}

// kind: excellent | good | average | poor
export function Face({ kind }) {
  const g = (id, a, b) => (
    <defs><linearGradient id={`cxf-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
  );
  if (kind === "excellent") return (
    <svg viewBox="0 0 40 40" aria-hidden="true">{g("e", "#bbf7d0", "#22C55E")}<circle cx="20" cy="20" r="18" fill="url(#cxf-e)" />
      <path d="M11.5 17.5q3-4.2 6 0M22.5 17.5q3-4.2 6 0" stroke="#052e16" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M11 23.5h18c-.4 5.2-4.2 8.5-9 8.5s-8.6-3.3-9-8.5z" fill="#052e16" /><path d="M15 29.6q5 2.6 10 0" stroke="#fb7185" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>
  );
  if (kind === "good") return (
    <svg viewBox="0 0 40 40" aria-hidden="true">{g("g", "#d9f99d", "#84cc16")}<circle cx="20" cy="20" r="18" fill="url(#cxf-g)" />
      <circle cx="14" cy="16.5" r="2.3" fill="#1a2e05" /><circle cx="26" cy="16.5" r="2.3" fill="#1a2e05" />
      <path d="M12.5 24.5q7.5 7.5 15 0" stroke="#1a2e05" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>
  );
  if (kind === "average") return (
    <svg viewBox="0 0 40 40" aria-hidden="true">{g("a", "#fde68a", "#f59e0b")}<circle cx="20" cy="20" r="18" fill="url(#cxf-a)" />
      <circle cx="14" cy="16.5" r="2.3" fill="#451a03" /><circle cx="26" cy="16.5" r="2.3" fill="#451a03" />
      <path d="M13.5 27h13" stroke="#451a03" strokeWidth="2.4" strokeLinecap="round" /></svg>
  );
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">{g("p", "#fecaca", "#ef4444")}<circle cx="20" cy="20" r="18" fill="url(#cxf-p)" />
      <circle cx="14" cy="16.5" r="2.3" fill="#450a0a" /><circle cx="26" cy="16.5" r="2.3" fill="#450a0a" />
      <path d="M12.5 29.5q7.5-7 15 0" stroke="#450a0a" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>
  );
}

// Circular progress. pct 0-100; tone "ok" (green to blue) or "due" (amber)
export function Ring({ pct, tone = "ok", children }) {
  const C = 2 * Math.PI * 78;
  const offset = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className={`cx-ring ${tone === "due" ? "due" : ""}`}>
      <svg viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="cxr-ok" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4ade80" /><stop offset=".55" stopColor="#22C55E" /><stop offset="1" stopColor="#3B82F6" /></linearGradient>
          <linearGradient id="cxr-due" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f97316" /></linearGradient>
        </defs>
        <circle cx="100" cy="100" r="92" stroke="var(--ring-dots)" strokeWidth="1" strokeDasharray="1.2 7.4" />
        <circle cx="100" cy="100" r="78" stroke="var(--ring-track)" strokeWidth="13" />
        {pct > 0 && (
          <circle className="arc" cx="100" cy="100" r="78" stroke={`url(#cxr-${tone === "due" ? "due" : "ok"})`} strokeWidth="13" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
        )}
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}

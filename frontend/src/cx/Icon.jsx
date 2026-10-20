// Icons for the customer screens. One shared <Sprite/> is rendered once by the shell; every
// <I n="..."/> then just points at a symbol in it. No icon library needed.
const P = {
  dash: <><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></>,
  sub: <><path d="M17 2.5l3.5 3.5L17 9.5" /><path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5" /><path d="M7 21.5L3.5 18 7 14.5" /><path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5" /></>,
  wallet: <><path d="M4 7.5A3.5 3.5 0 0 1 7.5 4H18v3.5" /><path d="M4 7.5V17a3 3 0 0 0 3 3h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H7.5A3.5 3.5 0 0 1 4 7.5z" /><circle cx="16.5" cy="14" r="1.1" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="3.5" /><path d="M2.5 10h19M6.5 15h3.5" /></>,
  hist: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" /><path d="M3.5 3.8v4.7H8.2M12 7.5V12l3 2" /></>,
  set: <><path d="M4 6.5h9M18 6.5h2M4 12h3M12 12h8M4 17.5h11M19.5 17.5H20" /><circle cx="15.5" cy="6.5" r="2.3" /><circle cx="9.5" cy="12" r="2.3" /><circle cx="17.5" cy="17.5" r="2.3" /></>,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="3" /><path d="M10.5 18.5h3" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1.8" /><rect x="14" y="3" width="7" height="7" rx="1.8" /><rect x="3" y="14" width="7" height="7" rx="1.8" /><path d="M14 14h3v3h-3zM21 14v.01M17.5 21H21M21 17.5V21" /></>,
  bank: <><path d="M3 9.5L12 4l9 5.5" /><path d="M5 10.5v7M9.7 10.5v7M14.3 10.5v7M19 10.5v7M3 20.5h18" /></>,
  shield: <><path d="M12 3l7.5 2.8v5.6c0 4.6-3 8.2-7.5 9.6-4.5-1.4-7.5-5-7.5-9.6V5.8L12 3z" /><path d="M8.7 12l2.3 2.3 4.4-4.6" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  receipt: <><path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21V3z" /><path d="M9.5 8h5M9.5 12h5" /></>,
  upload: <><path d="M12 16V4M7 8.5L12 4l5 4.5" /><path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" /></>,
  download: <><path d="M12 4v12M7 11.5l5 5 5-5" /><path d="M4 18.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="3" /><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
  leaf: <><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15" /><path d="M5 19c2.5-4 5.5-6.5 9-8" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  logout: <><path d="M9 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H9" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></>,
  pin: <><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <><path d="M3 3l18 18" /><path d="M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.2 3.9M6.3 7.3A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 4.1-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.01" /></>,
};

export function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        {Object.entries(P).map(([k, v]) => (
          <symbol key={k} id={`cx-i-${k}`} viewBox="0 0 24 24">{v}</symbol>
        ))}
      </defs>
    </svg>
  );
}

export function I({ n, size = 20, style }) {
  return (
    <svg className="cx-i" width={size} height={size} style={style} aria-hidden="true" focusable="false">
      <use href={`#cx-i-${n}`} />
    </svg>
  );
}

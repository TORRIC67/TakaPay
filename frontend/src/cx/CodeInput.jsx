// Six boxes for a one-time code. Typing moves forward, Backspace moves back, and pasting a whole
// code ("123456") fills every box. Calls onChange with the digits typed so far (a string).
import { useEffect, useRef, useState } from "react";

export default function CodeInput({ value = "", onChange, length = 6, autoFocus = true, disabled = false, label }) {
  const refs = useRef([]);
  const [digits, setDigits] = useState(() => Array.from({ length }, (_, i) => value[i] || ""));

  useEffect(() => { if (value === "") setDigits(Array(length).fill("")); }, [value, length]); // cleared from outside (e.g. "Resend")
  useEffect(() => { if (autoFocus) refs.current[0]?.focus(); }, [autoFocus]);

  const commit = (next) => { setDigits(next); onChange?.(next.join("")); };
  const focus = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  function onInput(i, raw) {
    const d = raw.replace(/\D/g, "");
    if (!d) return commit(digits.map((x, k) => (k === i ? "" : x)));
    if (d.length > 1) return fill(d, i); // some keyboards paste/auto-fill into one box
    commit(digits.map((x, k) => (k === i ? d : x)));
    focus(i + 1);
  }
  function fill(text, from = 0) {
    const d = text.replace(/\D/g, "");
    if (!d) return;
    const next = [...digits];
    for (let k = 0; k < d.length && from + k < length; k++) next[from + k] = d[k];
    commit(next);
    focus(Math.min(from + d.length, length - 1));
  }
  function onKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) { e.preventDefault(); commit(digits.map((x, k) => (k === i - 1 ? "" : x))); focus(i - 1); }
    else if (e.key === "ArrowLeft") focus(i - 1);
    else if (e.key === "ArrowRight") focus(i + 1);
  }

  return (
    <div className="cx-codes" role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={`cx-code ${d ? "filled" : ""}`}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? length : 1}
          disabled={disabled}
          aria-label={`${label || "Code"} ${i + 1}`}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => { e.preventDefault(); fill(e.clipboardData.getData("text"), 0); }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

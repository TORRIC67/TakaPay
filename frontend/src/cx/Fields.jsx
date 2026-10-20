// Form fields in the themed look. Field = text / number / tel / select; PasswordField adds a show/hide eye.
import { useState } from "react";
import { I } from "./Icon.jsx";

export function Field({ label, icon, type = "text", value, onChange, required, placeholder, step, autoComplete, inputMode, minLength, options, selectPlaceholder, autoFocus }) {
  return (
    <div className="cx-fieldwrap">
      {label && <div className="cx-lbl"><span>{label}</span></div>}
      <div className="cx-field">
        {icon && <span className="lead"><I n={icon} size={18} /></span>}
        {options ? (
          <>
            <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
              <option value="" disabled>{selectPlaceholder || "--"}</option>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="chev"><I n="chevron" size={16} /></span>
          </>
        ) : (
          <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
                 step={step} autoComplete={autoComplete} inputMode={inputMode} minLength={minLength} autoFocus={autoFocus} />
        )}
      </div>
    </div>
  );
}

export function PasswordField({ label, value, onChange, autoComplete = "current-password", minLength, required = true, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="cx-fieldwrap">
      {label && <div className="cx-lbl"><span>{label}</span></div>}
      <div className="cx-field">
        <span className="lead"><I n="lock" size={18} /></span>
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} required={required}
               autoComplete={autoComplete} minLength={minLength} placeholder={placeholder} autoFocus={autoFocus} />
        <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide" : "Show"} tabIndex={-1}>
          <I n={show ? "eyeoff" : "eye"} size={18} />
        </button>
      </div>
    </div>
  );
}

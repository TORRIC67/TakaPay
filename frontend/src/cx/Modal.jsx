// A small popup: a bottom sheet on phones, a centred card on larger screens.
// Closes with the X button, the Escape key, or a click on the dark area behind it.
import { useEffect } from "react";
import { I } from "./Icon.jsx";

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind must not scroll
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="cx-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cx-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="cx-modal-h">
          <h2>{title}</h2>
          <button type="button" className="cx-iconbtn" onClick={onClose} aria-label="Close"><I n="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

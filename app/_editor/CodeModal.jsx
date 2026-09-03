import { useEffect, useRef } from "react";

// The mermaid source, on demand. It used to be a second tab, which meant the
// canvas — the thing this editor is for — was hidden half the time. Now the
// canvas is always the view and the source is a sheet over it.
export default function CodeModal({ code, onChange, onClose, t }) {
  const areaRef = useRef(null);

  useEffect(() => {
    areaRef.current?.focus();
    const onKey = (e) => {
      // Escape closes, but not while a native autocomplete or IME is up inside
      // the textarea — those consume the key themselves.
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="code-modal-backdrop" onPointerDown={onClose}>
      <div className="code-modal" onPointerDown={(e) => e.stopPropagation()}>
        <textarea
          ref={areaRef}
          className="code-input"
          spellCheck={false}
          aria-label={t.header.code}
          value={code}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="code-modal-close"
          onClick={onClose}
          title={t.modals.cancel}
          aria-label={t.modals.cancel}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

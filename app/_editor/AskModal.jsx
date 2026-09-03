import { useRef } from "react";

// One text-prompt/confirm modal, shared by every part of the editor that
// used to reach for window.prompt/confirm — those can't be styled, can't be
// translated consistently, and some browsers suppress them outright.
// `ask` is null (closed) or { kind: "text"|"confirm", title, value?, onDone }.
export default function AskModal({ ask, onClose, t }) {
  const inputRef = useRef(null);
  if (!ask) return null;

  function commit() {
    ask.onDone(ask.kind === "text" ? (inputRef.current?.value ?? "") : true);
    onClose();
  }

  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className="modal-panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-title">{ask.title}</div>
        {ask.kind === "text" && (
          <input
            autoFocus
            className="modal-input"
            defaultValue={ask.value}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commit();
              if (e.key === "Escape") onClose();
            }}
            ref={inputRef}
          />
        )}
        <div className="modal-actions">
          <button onClick={onClose}>{t.modals.cancel}</button>
          <button className="primary" onClick={commit}>{t.modals.ok}</button>
        </div>
      </div>
    </div>
  );
}

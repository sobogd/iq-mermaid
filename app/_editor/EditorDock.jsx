import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Code2 } from "lucide-react";
import ToolIcon from "./ToolIcon.jsx";
import { analytics } from "@/lib/analytics";
import {
  EDITOR_ADD_BLOCK_EVENT,
  EDITOR_ADD_GROUP_EVENT,
  EDITOR_CODE_EVENT,
  EDITOR_COPY_BLOCK_EVENT,
  EDITOR_DOCK_STATE_EVENT,
  EDITOR_FIT_EVENT,
  EDITOR_PASTE_EVENT,
  EDITOR_REDO_EVENT,
  EDITOR_STATUS_EVENT,
  EDITOR_UNDO_EVENT,
  EDITOR_ZOOM_IN_EVENT,
  EDITOR_ZOOM_OUT_EVENT,
  isContentWindowOpen,
} from "../_landing/desktop/editor-events";
import { openEditor } from "../_landing/desktop/open-editor";
import "./dock.css";

const STATUS_CLEAR_MS = 2500;
const IDLE_DOCK_STATE = { canCopy: false, canPaste: false, canUndo: false, canRedo: false };

// The editor's two floating dock rails, extracted out of the heavy
// EditorShell/VisualEditor bundle so they render on every marketing page
// (eagerly, like the taskbar) while mermaid stays behind the lazy boundary.
// The buttons here only *dispatch* window events; VisualEditor listens and
// does the real work once it has booted. Before the canvas exists the
// state-dependent buttons (copy/paste/undo/redo) are honestly disabled —
// there is nothing selected, nothing on the clipboard and no history yet.
//
// Portaled onto <body> so the rails stay above the closable content window.
// While that window is open a press on the dock only opens the editor first
// (dockGuard) — the canvas is never edited "behind" the landing.
export default function EditorDock({ t }) {
  const [status, setStatus] = useState("");
  const [dockState, setDockState] = useState(IDLE_DOCK_STATE);

  useEffect(() => {
    const onState = (e) => setDockState(e.detail || IDLE_DOCK_STATE);
    window.addEventListener(EDITOR_DOCK_STATE_EVENT, onState);
    return () => window.removeEventListener(EDITOR_DOCK_STATE_EVENT, onState);
  }, []);

  useEffect(() => {
    const onStatus = (e) => setStatus(typeof e.detail === "string" ? e.detail : "");
    window.addEventListener(EDITOR_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(EDITOR_STATUS_EVENT, onStatus);
  }, []);

  // A status line that never clears stops being a status line. The shell owns
  // *when* to flash; the dock owns the auto-clear.
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), STATUS_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [status]);

  // Dock rails act on the canvas only once the editor is revealed. While the
  // content window is open, any press on them opens the editor and does
  // nothing else. Reads the live state so a remount can never leave the guard
  // stale.
  const dockGuard = (e) => {
    if (!isContentWindowOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    openEditor();
  };

  const fire = (type) => () => window.dispatchEvent(new Event(type));

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <aside
        className="iqm-dock iqm-dock-left"
        data-scheme="tertiary"
        onPointerDownCapture={dockGuard}
        onClickCapture={dockGuard}
      >
        <div className="header-actions">
          <button
            type="button"
            className="dock-btn"
            aria-label={t.toolbar.addBlock}
            onClick={fire(EDITOR_ADD_BLOCK_EVENT)}
          >
            <ToolIcon name="addBlock" />
            <span className="dock-tip">{t.dock.addBlock}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            aria-label={t.toolbar.addGroup}
            onClick={fire(EDITOR_ADD_GROUP_EVENT)}
          >
            <ToolIcon name="addGroup" />
            <span className="dock-tip">{t.dock.addGroup}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            aria-label={t.toolbar.copy}
            onClick={fire(EDITOR_COPY_BLOCK_EVENT)}
            disabled={!dockState.canCopy}
          >
            <ToolIcon name="copy" />
            <span className="dock-tip">{t.dock.copy}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            aria-label={t.toolbar.paste}
            onClick={fire(EDITOR_PASTE_EVENT)}
            disabled={!dockState.canPaste}
          >
            <ToolIcon name="paste" />
            <span className="dock-tip">{t.dock.paste}</span>
          </button>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="dock-btn"
            aria-label={t.dock.editCode}
            onClick={() => {
              analytics.track("Click", "Dock edit code");
              window.dispatchEvent(new Event(EDITOR_CODE_EVENT));
            }}
          >
            <Code2 className="tool-icon" strokeWidth={1.75} />
            <span className="dock-tip">{t.dock.editCode}</span>
          </button>
        </div>
      </aside>
      <aside
        className="iqm-dock iqm-dock-right"
        data-scheme="tertiary"
        onPointerDownCapture={dockGuard}
        onClickCapture={dockGuard}
      >
        <div className="header-zoom">
          <button
            type="button"
            className="dock-btn"
            onClick={fire(EDITOR_UNDO_EVENT)}
            aria-label={t.toolbar.undo}
            disabled={!dockState.canUndo}
          >
            <ToolIcon name="undo" />
            <span className="dock-tip">{t.dock.undo}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            onClick={fire(EDITOR_REDO_EVENT)}
            aria-label={t.toolbar.redo}
            disabled={!dockState.canRedo}
          >
            <ToolIcon name="redo" />
            <span className="dock-tip">{t.dock.redo}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            onClick={fire(EDITOR_ZOOM_IN_EVENT)}
            aria-label={t.zoom.in}
          >
            <ToolIcon name="zoomIn" />
            <span className="dock-tip">{t.dock.zoomIn}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            onClick={fire(EDITOR_ZOOM_OUT_EVENT)}
            aria-label={t.zoom.out}
          >
            <ToolIcon name="zoomOut" />
            <span className="dock-tip">{t.dock.zoomOut}</span>
          </button>
          <button
            type="button"
            className="dock-btn"
            onClick={fire(EDITOR_FIT_EVENT)}
            aria-label={t.zoom.fit}
          >
            <ToolIcon name="fit" />
            <span className="dock-tip">{t.dock.fit}</span>
          </button>
        </div>
        <div className="status-line" role="status" aria-live="polite">{status}</div>
      </aside>
    </>,
    document.body,
  );
}

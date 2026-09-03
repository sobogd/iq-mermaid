import { useRef, useState } from "react";
import Link from "next/link";
import TextEditor from "./TextEditor.jsx";
import VisualEditor from "./VisualEditor.jsx";
import { LogoIcon } from "../_landing/LogoIcon";
import "./editor.css";

const SYNC_DEBOUNCE = 400;

// The editor itself: a full-height two-tab workspace (visual canvas / mermaid
// source) that keeps both sides in sync. Ported from the standalone Vite app
// unchanged apart from the strings, which now come from `t`
// (content/editor/<locale>.json) instead of being hardcoded.
export default function EditorShell({ t, homeHref }) {
  const [tab, setTab] = useState("visual");
  const [code, setCode] = useState("");
  const [importText, setImportText] = useState("");
  const [importSeq, setImportSeq] = useState(0);
  const [actionsSlot, setActionsSlot] = useState(null);
  const [zoomSlot, setZoomSlot] = useState(null);
  const lastVisualCodeRef = useRef("");
  const debounceRef = useRef(null);

  function handleVisualCode(text) {
    lastVisualCodeRef.current = text;
    setCode(text);
  }

  function handleTextChange(text) {
    setCode(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text === lastVisualCodeRef.current) return;
      setImportText(text);
      setImportSeq((n) => n + 1);
    }, SYNC_DEBOUNCE);
  }

  return (
    <div className="app">
      <header className="app-header">
        <Link href={homeHref} className="brand" title={t.backToSite}>
          <LogoIcon className="brand-badge" />
          <span className="brand-name">Mermaid</span>
        </Link>
        <div className="header-actions" ref={setActionsSlot} />
        <div className="header-zoom" ref={setZoomSlot} />
        <div className="tabs">
          <button className={tab === "visual" ? "active" : ""} onClick={() => setTab("visual")}>
            {t.tabs.visual}
          </button>
          <button className={tab === "text" ? "active" : ""} onClick={() => setTab("text")}>
            {t.tabs.text}
          </button>
        </div>
      </header>
      <main className="app-main">
        <div style={{ display: tab === "visual" ? "flex" : "none", flex: 1, minHeight: 0 }}>
          <VisualEditor
            active={tab === "visual"}
            actionsSlot={actionsSlot}
            zoomSlot={zoomSlot}
            onCodeChange={handleVisualCode}
            importText={importText}
            importSeq={importSeq}
            t={t}
          />
        </div>
        <div style={{ display: tab === "text" ? "flex" : "none", flex: 1, minHeight: 0 }}>
          <TextEditor
            active={tab === "text"}
            actionsSlot={actionsSlot}
            code={code}
            onChange={handleTextChange}
            t={t}
          />
        </div>
      </main>
    </div>
  );
}

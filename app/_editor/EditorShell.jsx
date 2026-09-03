import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TextEditor from "./TextEditor.jsx";
import VisualEditor from "./VisualEditor.jsx";
import { LogoIcon } from "../_landing/LogoIcon";
import { configureMermaid } from "./mermaid-client";
import * as exporters from "./export";
import "./editor.css";

const SYNC_DEBOUNCE = 400;
const CODE_KEY = "mermaid-editor-code";

// The visual canvas only understands flowcharts. Everything else — sequence,
// class, ER, gantt — renders in the code tab and is left alone, so the tab has
// to be able to say which case it is in.
const isFlowchart = (code) => !code.trim() || /^\s*(flowchart|graph)\b/i.test(code);

// The editor itself: a full-height two-tab workspace (visual canvas / mermaid
// source) that keeps both sides in sync. Ported from the standalone Vite app;
// the strings come from `t` (content/editor/<locale>.json).
export default function EditorShell({ t, homeHref }) {
  const [tab, setTab] = useState("visual");
  const [code, setCode] = useState("");
  const [importText, setImportText] = useState("");
  const [importSeq, setImportSeq] = useState(0);
  const [actionsSlot, setActionsSlot] = useState(null);
  const [zoomSlot, setZoomSlot] = useState(null);
  const [status, setStatus] = useState("");
  const [themeSeq, setThemeSeq] = useState(0);
  const lastVisualCodeRef = useRef("");
  const debounceRef = useRef(null);
  const statusTimerRef = useRef(null);

  // Mermaid's own light/dark themes, following the OS setting the rest of the
  // site follows. Bumping themeSeq is what makes both tabs redraw.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      configureMermaid(mq.matches);
      setThemeSeq((n) => n + 1);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // The code tab's content is restored as well as the canvas state. Without
  // this a sequence diagram — which the canvas cannot represent — simply did
  // not survive a reload, while the landing page promises it does.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CODE_KEY);
      if (saved && !isFlowchart(saved)) {
        setCode(saved);
        lastVisualCodeRef.current = saved;
      }
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CODE_KEY, code);
    } catch {
      /* quota or private mode */
    }
  }, [code]);

  useEffect(() => () => {
    clearTimeout(debounceRef.current);
    clearTimeout(statusTimerRef.current);
  }, []);

  function flash(message) {
    setStatus(message);
    clearTimeout(statusTimerRef.current);
    // A status line that never clears stops being a status line.
    statusTimerRef.current = setTimeout(() => setStatus(""), 2500);
  }

  async function runExport(fn, okMessage) {
    try {
      await fn(code);
      flash(okMessage);
    } catch {
      flash(t.text.statusExportFailed);
    }
  }

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

  const codeOnly = !isFlowchart(code);
  const exportActions = [
    { label: t.text.copyMermaid, run: () => runExport(exporters.copyMermaid, t.text.statusMermaidCopied) },
    { label: t.text.downloadMmd, run: () => runExport(exporters.downloadMermaid, t.text.statusSaved) },
    { label: t.text.downloadMd, run: () => runExport(exporters.downloadMarkdown, t.text.statusSaved) },
    { label: t.text.copySvg, run: () => runExport(exporters.copySvg, t.text.statusSvgCopied) },
    { label: t.text.downloadSvg, run: () => runExport(exporters.downloadSvg, t.text.statusSaved) },
    { label: t.text.downloadPng, run: () => runExport(exporters.downloadPng, t.text.statusSaved) },
  ];

  return (
    <div className="iqm-root app">
      <header className="app-header">
        <Link href={homeHref} className="brand" title={t.backToSite}>
          <LogoIcon className="brand-badge" />
          <span className="brand-name">Mermaid</span>
        </Link>
        <div className="header-actions" ref={setActionsSlot} />
        <div className="header-zoom" ref={setZoomSlot} />
        {/* Export lives here, not inside a tab: it acts on the mermaid source,
            which both tabs share, and putting it in the code tab used to make
            the visual canvas a dead end. */}
        <div className="header-export">
          {exportActions.map((a) => (
            <button key={a.label} onClick={a.run} title={a.label}>{a.label}</button>
          ))}
        </div>
        <span className="status-line" role="status" aria-live="polite">{status}</span>
        <div className="tabs">
          <button
            className={tab === "visual" ? "active" : ""}
            aria-pressed={tab === "visual"}
            onClick={() => setTab("visual")}
          >
            {t.tabs.visual}
          </button>
          <button
            className={tab === "text" ? "active" : ""}
            aria-pressed={tab === "text"}
            onClick={() => setTab("text")}
          >
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
            themeSeq={themeSeq}
            codeOnly={codeOnly}
            t={t}
          />
        </div>
        <div style={{ display: tab === "text" ? "flex" : "none", flex: 1, minHeight: 0 }}>
          <TextEditor
            active={tab === "text"}
            actionsSlot={actionsSlot}
            code={code}
            onChange={handleTextChange}
            themeSeq={themeSeq}
            t={t}
          />
        </div>
      </main>
    </div>
  );
}

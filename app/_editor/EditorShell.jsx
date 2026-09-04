import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import VisualEditor, { defaultState, toMermaid } from "./VisualEditor.jsx";
import CodeModal from "./CodeModal.jsx";
import AskModal from "./AskModal.jsx";
import { LogoIcon } from "../_landing/LogoIcon";
import { configureMermaid } from "./mermaid-client";
import * as exporters from "./export";
import { PageTracker } from "../_landing/PageTracker";
import { analytics } from "@/lib/analytics";
import {
  deleteDocument,
  loadDocuments,
  newDocumentId,
  renameDocument,
  saveCurrentDocumentId,
  saveDocument,
} from "./documents";
import "./editor.css";

const SYNC_DEBOUNCE = 400;
const DOC_SAVE_DEBOUNCE = 600;

// The visual canvas only understands flowcharts. Everything else — sequence,
// class, ER, gantt — can be written in the source but not drawn here, so the
// canvas has to be able to say which case it is in.
const isFlowchart = (code) => !code.trim() || /^\s*(flowchart|graph)\b/i.test(code);

const formatDate = (ms) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));

// The editor: a full-height canvas, with the mermaid source available as a
// sheet over it. The two are kept in sync in both directions. Ported from the
// standalone Vite app; the strings come from `t` (content/editor/<locale>.json).
export default function EditorShell({ t, homeHref, email, onSignOut }) {
  // Gates the canvas' first mount until the boot effect below has resolved
  // which document is actually open — VisualEditor has its own localStorage
  // cache and would otherwise flash whatever THAT happened to hold for one
  // frame before the real document's source lands.
  const [ready, setReady] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [docAsk, setDocAsk] = useState(null);
  const [docs, setDocs] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [code, setCode] = useState("");
  const [importText, setImportText] = useState("");
  const [importSeq, setImportSeq] = useState(0);
  const [actionsSlot, setActionsSlot] = useState(null);
  const [zoomSlot, setZoomSlot] = useState(null);
  const [status, setStatus] = useState("");
  const [themeSeq, setThemeSeq] = useState(0);
  const lastVisualCodeRef = useRef("");
  const debounceRef = useRef(null);
  const docSaveDebounceRef = useRef(null);
  const statusTimerRef = useRef(null);
  const currentDocIdRef = useRef(null);
  // The code as last loaded from storage. Autosave only fires when `code`
  // differs from this, so merely opening/switching a document never re-saves it
  // (which used to bump its "edited" timestamp for no reason).
  const loadedCodeRef = useRef("");

  // Mermaid's own light/dark themes, following the OS setting the rest of the
  // site follows. Bumping themeSeq is what makes the canvas redraw.
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

  // Resolve which document is open on first load: whatever was open last
  // time, or — the very first visit, or if that one was since deleted
  // elsewhere — a fresh document seeded with the same starter diagram a
  // first-time visitor has always landed on. Runs once; every later switch
  // goes through openDocument/startNewDocument below.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list = [];
      let lastId = null;
      try {
        ({ docs: list, currentId: lastId } = await loadDocuments());
      } catch {
        // Storage unreachable — fall through to a fresh in-memory document so
        // the editor still opens instead of a blank page.
      }
      let doc = list.find((d) => d.id === lastId);
      if (!doc) {
        const id = newDocumentId();
        const seedCode = toMermaid(defaultState(t));
        try {
          // saveDocument derives the title the exact same way every later save
          // does, rather than a second, hand-rolled copy of that logic here.
          list = await saveDocument(id, seedCode, t.documents.untitled);
          await saveCurrentDocumentId(id);
        } catch {
          list = [{ id, title: t.documents.untitled, code: seedCode, updatedAt: Date.now() }];
        }
        doc = list.find((d) => d.id === id) || list[0];
      }
      if (cancelled) return;
      setDocs(list);
      currentDocIdRef.current = doc.id;
      setCurrentDocId(doc.id);
      loadedCodeRef.current = doc.code;
      setCode(doc.code);
      lastVisualCodeRef.current = doc.code;
      setImportText(doc.code);
      setImportSeq((n) => n + 1);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once at mount — every later document switch is a deliberate user
    // action (openDocument/startNewDocument), not a reaction to props/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosaves the open document on every change to its source, regardless of
  // whether that change came from typing in the sheet or editing the canvas
  // — both funnel through `code`. Debounced so a fast typing burst or a drag
  // on the canvas doesn't serialise the whole document list on every frame.
  useEffect(() => {
    if (!ready || !currentDocIdRef.current) return;
    clearTimeout(docSaveDebounceRef.current);
    if (code === loadedCodeRef.current) return;
    docSaveDebounceRef.current = setTimeout(() => {
      saveDocument(currentDocIdRef.current, code, t.documents.untitled)
        .then((list) => {
          loadedCodeRef.current = code;
          setDocs(list);
        })
        .catch(() => {});
    }, DOC_SAVE_DEBOUNCE);
    return () => clearTimeout(docSaveDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, ready]);

  useEffect(() => () => {
    clearTimeout(debounceRef.current);
    clearTimeout(docSaveDebounceRef.current);
    clearTimeout(statusTimerRef.current);
  }, []);

  function flash(message) {
    setStatus(message);
    clearTimeout(statusTimerRef.current);
    // A status line that never clears stops being a status line.
    statusTimerRef.current = setTimeout(() => setStatus(""), 2500);
  }

  async function runExport(fn, okMessage, key) {
    try {
      await fn(code);
      analytics.track("Export", key);
      flash(okMessage);
    } catch {
      analytics.track("Show", `Export failed: ${key}`);
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

  // Switches the open document: flushes any pending autosave of the one being
  // left (so a fast New/Open right after typing never loses the last
  // keystrokes), then loads the target's source through the same import
  // pipeline the sheet already uses to push text onto the canvas.
  //
  // `flush: false` is for the one case where re-saving the document being
  // left would be wrong: it was just deleted. Without the flag, this would
  // silently resurrect it — flush always re-persists under
  // currentDocIdRef.current, which at that point is still the deleted id.
  async function switchTo(id, sourceCode, { flush = true } = {}) {
    clearTimeout(docSaveDebounceRef.current);
    if (flush && currentDocIdRef.current && code !== loadedCodeRef.current) {
      try {
        setDocs(await saveDocument(currentDocIdRef.current, code, t.documents.untitled));
      } catch {
        // Best-effort flush; the switch still proceeds even if storage is down.
      }
    }
    currentDocIdRef.current = id;
    setCurrentDocId(id);
    saveCurrentDocumentId(id).catch(() => {});
    loadedCodeRef.current = sourceCode;
    setCode(sourceCode);
    lastVisualCodeRef.current = sourceCode;
    setImportText(sourceCode);
    setImportSeq((n) => n + 1);
  }

  function openDocument(doc) {
    analytics.track("Click", "Open document");
    switchTo(doc.id, doc.code);
    setOpenOpen(false);
  }

  // The document on screen is saved (via switchTo's flush) before a new,
  // blank one is created and opened — nothing is lost, it is just no longer
  // the one in front of you. `flush: false` only when called after the
  // current document was just deleted (see confirmDeleteDocument).
  async function startNewDocument({ flush = true } = {}) {
    const seedCode = toMermaid(defaultState(t));
    const id = newDocumentId();
    await switchTo(id, seedCode, { flush });
    try {
      setDocs(await saveDocument(id, seedCode, t.documents.untitled));
    } catch {
      // Non-fatal: the new document still lives on screen.
    }
    setOpenOpen(false);
  }

  function confirmDeleteDocument(doc) {
    setDocAsk({
      kind: "confirm",
      title: t.documents.deleteConfirm,
      onDone: async (ok) => {
        if (!ok) return;
        analytics.track("Click", "Delete document");
        const wasCurrent = doc.id === currentDocIdRef.current;
        let next;
        try {
          next = await deleteDocument(doc.id);
        } catch {
          return;
        }
        setDocs(next);
        if (!wasCurrent) return;
        // The document you were looking at is the one just deleted: fall
        // back to whatever else exists, or start fresh if nothing does —
        // never flush, or the deleted document comes right back.
        if (next.length) await switchTo(next[0].id, next[0].code, { flush: false });
        else await startNewDocument({ flush: false });
      },
    });
  }

  function confirmRenameDocument(doc) {
    setDocAsk({
      kind: "text",
      title: t.documents.rename,
      value: doc.customTitle || doc.title,
      onDone: async (value) => {
        if (value == null) return;
        try {
          setDocs(await renameDocument(doc.id, value.trim()));
        } catch {
          // Non-fatal: the title simply stays as it was.
        }
      },
    });
  }

  const codeOnly = !isFlowchart(code);

  const exportActions = [
    { icon: "📋", label: t.text.copyMermaid, run: () => runExport(exporters.copyMermaid, t.text.statusMermaidCopied, "Copy mermaid") },
    { icon: "💾", label: t.text.downloadMmd, run: () => runExport(exporters.downloadMermaid, t.text.statusSaved, "Download mmd") },
    { icon: "📝", label: t.text.downloadMd, run: () => runExport(exporters.downloadMarkdown, t.text.statusSaved, "Download md") },
    { icon: "📋", label: t.text.copySvg, run: () => runExport(exporters.copySvg, t.text.statusSvgCopied, "Copy svg") },
    { icon: "💾", label: t.text.downloadSvg, run: () => runExport(exporters.downloadSvg, t.text.statusSaved, "Download svg") },
    { icon: "🖼️", label: t.text.downloadPng, run: () => runExport(exporters.downloadPng, t.text.statusSaved, "Download png") },
  ];

  return (
    <div className="iqm-root app">
      <PageTracker page="App" />
      <header className="app-header">
        <Link href={homeHref} className="brand" title={t.backToSite}>
          <LogoIcon className="brand-badge" />
        </Link>
        <div className="header-actions" ref={setActionsSlot} />
        <div className="header-zoom" ref={setZoomSlot} />
        <span className="status-line" role="status" aria-live="polite">{status}</span>
        <span className="header-sep" />
        <button
          className="header-icon-btn"
          onClick={() => {
            analytics.track("Click", "Open documents");
            setOpenOpen(true);
          }}
          title={t.header.open}
          aria-label={t.header.open}
        >
          📂
        </button>
        <button
          className="header-icon-btn"
          onClick={() => {
            analytics.track("Click", "New document");
            startNewDocument();
          }}
          title={t.header.newDocument}
          aria-label={t.header.newDocument}
        >
          ✏️
        </button>
        <span className="header-sep" />
        <button
          className="header-icon-btn"
          onClick={() => {
            analytics.track("Click", "Download menu");
            setDownloadOpen(true);
          }}
          title={t.header.download}
          aria-label={t.header.download}
        >
          📥
        </button>
        <span className="header-sep" />
        <button
          className="header-icon-btn"
          onClick={() => {
            analytics.track("Click", "Code view");
            setCodeOpen(true);
          }}
          title={t.header.code}
          aria-label={t.header.code}
        >
          💻
        </button>
        <button
          className="header-icon-btn"
          onClick={() => {
            analytics.track("Click", "Sign out");
            onSignOut();
          }}
          title={`${t.auth.signedInAs} ${email}`}
          aria-label={t.auth.signOut}
        >
          🔑
        </button>
      </header>
      <main className="app-main">
        {ready && (
          <VisualEditor
            active
            actionsSlot={actionsSlot}
            zoomSlot={zoomSlot}
            onCodeChange={handleVisualCode}
            importText={importText}
            importSeq={importSeq}
            themeSeq={themeSeq}
            codeOnly={codeOnly}
            t={t}
          />
        )}
      </main>
      {codeOpen && (
        <CodeModal code={code} onChange={handleTextChange} onClose={() => setCodeOpen(false)} t={t} />
      )}
      {downloadOpen && (
        <div className="modal-backdrop" onPointerDown={() => setDownloadOpen(false)}>
          <div className="modal-panel" onPointerDown={(e) => e.stopPropagation()}>
            <div className="modal-title">{t.modals.downloadTitle}</div>
            <div className="modal-list">
              {exportActions.map((a) => (
                <button
                  key={a.label}
                  className="modal-list-btn"
                  onClick={() => {
                    a.run();
                    setDownloadOpen(false);
                  }}
                >
                  <span className="modal-list-icon">{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {openOpen && (
        <div className="modal-backdrop" onPointerDown={() => setOpenOpen(false)}>
          <div className="modal-panel" onPointerDown={(e) => e.stopPropagation()}>
            <div className="modal-title">{t.modals.openTitle}</div>
            <div className="modal-list modal-list-scroll">
              {docs.map((d) => (
                <div key={d.id} className="modal-list-row">
                  <button
                    className={"modal-list-btn" + (d.id === currentDocId ? " active" : "")}
                    onClick={() => openDocument(d)}
                  >
                    <span className="modal-list-title">{d.customTitle || d.title}</span>
                    <span className="modal-list-date">{formatDate(d.updatedAt)}</span>
                  </button>
                  <button
                    className="modal-list-rename"
                    title={t.documents.rename}
                    aria-label={t.documents.rename}
                    onClick={() => confirmRenameDocument(d)}
                  >
                    ✏️
                  </button>
                  <button
                    className="modal-list-delete danger"
                    title={t.documents.delete}
                    aria-label={t.documents.delete}
                    onClick={() => confirmDeleteDocument(d)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <AskModal ask={docAsk} onClose={() => setDocAsk(null)} t={t} />
    </div>
  );
}

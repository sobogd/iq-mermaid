import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import VisualEditor, { defaultState, toMermaid } from "./VisualEditor.jsx";
import CodeModal from "./CodeModal.jsx";
import AskModal from "./AskModal.jsx";
import AuthGate from "./AuthGate.jsx";
import { configureMermaid } from "./mermaid-client";
import * as exporters from "./export";
import { analytics } from "@/lib/analytics";
import { isDarkTheme, subscribeTheme } from "@/lib/theme";
import {
  ANON_STORE,
  SERVER_STORE,
  clearAnonDocument,
  loadAnonDocument,
  newDocumentId,
} from "./documents";
import {
  CONTENT_OPEN_EVENT,
  EDITOR_DOWNLOAD_EVENT,
  EDITOR_COPY_EVENT,
  EDITOR_CODE_EVENT,
  EDITOR_OPEN_DOCS_EVENT,
  EDITOR_NEW_DOC_EVENT,
  EDITOR_READY_EVENT,
  isContentWindowOpen,
  publishStatus,
  requestContentOpen,
} from "../_landing/desktop/editor-events";
import { openEditor } from "../_landing/desktop/open-editor";
import "./editor.css";

const DOC_SAVE_DEBOUNCE = 600;

// Mermaid lets a diagram start with %% comment lines and %%{init: ...}%%
// directives before the diagram-type declaration, so the classifier must look
// past those to the first real statement — otherwise `%%{init:{...}}\n
// flowchart TD …` is treated as non-flowchart and the canvas locks itself out.
const isFlowchart = (code) => {
  const trimmed = (code || "").trim();
  if (!trimmed) return true;
  const body = trimmed
    .split("\n")
    .filter((line) => !/^\s*%%/.test(line))
    .join("\n")
    .trim();
  if (!body) return false;
  return /^(flowchart|graph)\b/i.test(body);
};

const formatDate = (ms) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));

// The editor: a full-height canvas, with the mermaid source available as a
// sheet over it. The two are kept in sync in both directions. Ported from the
// standalone Vite app; the strings come from `t` (content/editor/<locale>.json).
//
// The editor is now the shared background layer of every marketing page, so its
// chrome has moved out of a top header into a floating left dock (rendered via
// a portal onto <body> so it stays above the closable content window).
//
// Signing in is optional and buys exactly one thing: more than one document.
// The canvas, the code sheet, export, copy and open all work signed out, and an
// anonymous visitor works in a single document slot kept in their browser
// (ANON_STORE). Only creating a SECOND document — or asking for more in the
// document list — raises `requireAuth`, which swaps in the inline AuthGate
// until `onAuthed(email)` lands, at which point that one local document is
// handed over to the new account (handleAuthed).
export default function EditorShell({ t, authed, onAuthed }) {
  // Gates the canvas' first mount until the boot effect below has resolved
  // which document is actually open — VisualEditor has its own localStorage
  // cache and would otherwise flash whatever THAT happened to hold for one
  // frame before the real document's source lands.
  const [ready, setReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [docAsk, setDocAsk] = useState(null);
  const [docs, setDocs] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [code, setCode] = useState("");
  const [importText, setImportText] = useState("");
  const [importSeq, setImportSeq] = useState(0);
  const [themeSeq, setThemeSeq] = useState(0);
  // Bumped after a manual code edit so VisualEditor re-fits (centres) the
  // diagram once it has rendered the new source.
  const [recenterSeq, setRecenterSeq] = useState(0);
  const lastVisualCodeRef = useRef("");
  const docSaveDebounceRef = useRef(null);
  const currentDocIdRef = useRef(null);
  const pendingAuthRef = useRef(null);
  // The source the *starter* diagram has in this locale. "Create new" compares
  // against it to tell an untouched slot from real work worth protecting (see
  // requestNewDocument): replacing the starter costs nothing and must not send
  // a brand-new visitor to a sign-in gate.
  const seedCodeRef = useRef("");
  // Which backend the shell writes to. An anonymous visitor gets the single
  // browser slot, a signed-in one the account list; switching happens in place
  // when a visitor signs in. Kept in a ref as well as in `store`, because that
  // switch happens mid-flight (handleAuthed) while callbacks captured by the
  // already-open AuthGate still close over the previous value.
  const store = authed ? SERVER_STORE : ANON_STORE;
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);
  // The code as last loaded from storage. Autosave only fires when `code`
  // differs from this, so merely opening/switching a document never re-saves it
  // (which used to bump its "edited" timestamp for no reason).
  const loadedCodeRef = useRef("");

  // Mermaid's own light/dark themes, following the site's resolved theme
  // (OS preference by default, but overridable from the header's Settings →
  // Theme menu — see lib/theme.ts). Bumping themeSeq makes the canvas
  // redraw; subscribeTheme re-resolves when the OS flips in "system" mode and
  // when the visitor picks a theme manually anywhere.
  useEffect(() => {
    const apply = () => {
      configureMermaid(isDarkTheme());
      setThemeSeq((n) => n + 1);
    };
    apply();
    return subscribeTheme(apply);
  }, []);

  // Resolve which document is open on first load: whatever was open last
  // time, or — the very first visit, or if that one was since deleted
  // elsewhere — a fresh document seeded with the same starter diagram a
  // first-time visitor has always landed on. Runs once; every later switch
  // goes through openDocument/startNewDocument below. Which storage it reads
  // depends on whether the visitor arrived signed in (see `store`).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list = [];
      let lastId = null;
      try {
        ({ docs: list, currentId: lastId } = await storeRef.current.load());
      } catch {
        // Storage unreachable — fall through to a fresh in-memory document so
        // the editor still opens instead of a blank page.
      }
      let doc = list.find((d) => d.id === lastId);
      // The starter diagram of this locale, whether or not a document was
      // found: "Create new" compares the open source against it to tell an
      // untouched slot from real work (see requestNewDocument), and that
      // comparison has to keep working after a reload, not just on the very
      // first boot.
      const seedCode = toMermaid(defaultState(t));
      seedCodeRef.current = seedCode;
      // The pointer can be null (a sign-in that never edited anything further)
      // or point at a document deleted elsewhere — in both cases reopen the
      // most recently edited document instead of fabricating a new one, which
      // used to litter the account with fresh starter docs per stray boot.
      if (!doc && list.length > 0) {
        doc = list[0];
        storeRef.current.setCurrent(doc.id).catch(() => {});
      }
      if (!doc) {
        const id = newDocumentId();
        try {
          // save() derives the title the exact same way every later save
          // does, rather than a second, hand-rolled copy of that logic here.
          list = await storeRef.current.save(id, seedCode, t.documents.untitled);
          await storeRef.current.setCurrent(id);
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

  // EditorClient mounts this shell lazily — the whole mermaid bundle only
  // loads on the first reveal, not on marketing page loads. Taskbar actions
  // (export/copy/documents/new) that arrive before that boot are queued by
  // EditorClient and replayed when the shell is actually listening; this
  // ready announcement is that "now" signal. Fires once per shell mount.
  useEffect(() => {
    if (!ready) return;
    window.dispatchEvent(new Event(EDITOR_READY_EVENT));
  }, [ready]);

  // Autosaves the open document on every change to its source, regardless of
  // whether that change came from typing in the sheet or editing the canvas
  // — both funnel through `code`. Debounced so a fast typing burst or a drag
  // on the canvas doesn't serialise the whole document list on every frame.
  // Writes go through storeRef, so an autosave that lands just after a sign-in
  // goes to the account rather than back into the anonymous slot.
  useEffect(() => {
    if (!ready || !currentDocIdRef.current) return;
    clearTimeout(docSaveDebounceRef.current);
    if (code === loadedCodeRef.current) return;
    docSaveDebounceRef.current = setTimeout(() => {
      storeRef.current
        .save(currentDocIdRef.current, code, t.documents.untitled)
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
    clearTimeout(docSaveDebounceRef.current);
  }, []);

  // The dock (a separate, eager tree) renders the status line, so flashes are
  // broadcast; the dock owns the auto-clear after a couple of seconds.
  function flash(message) {
    publishStatus(message);
  }

  // Signs the visitor in on demand, for the one action that genuinely needs an
  // account: keeping MORE than one document. Everything else — the canvas, the
  // code sheet, export, copy, open, replacing an empty draft — works signed
  // out. It closes whatever content window is open (the editor and its gate
  // always take the whole desktop), raises the inline gate and defers `action`
  // until `onAuthed(email)` has landed. Returns true when the action may
  // proceed now (authed), false when it was deferred.
  function requireAuth(action) {
    if (authed) {
      action();
      return true;
    }
    pendingAuthRef.current = action;
    if (isContentWindowOpen()) openEditor();
    setAuthOpen(true);
    return false;
  }

  // Called by the inline gate once the visitor is signed in. The diagram they
  // were drawing anonymously is handed to the new account as a NEW document
  // before anything else happens: the local slot is the only record of that
  // work, and a sign-in is the worst possible moment to lose it. Only once the
  // account really holds it is the local copy dropped and the action that
  // waited behind the gate (creating a second document) run.
  async function handleAuthed(nextEmail) {
    onAuthed(nextEmail);
    setAuthOpen(false);
    const pending = pendingAuthRef.current;
    pendingAuthRef.current = null;
    // Sign-in flips which backend the shell writes to. Doing it here, rather
    // than waiting for the re-render, keeps the handover and the deferred
    // action on the account side — otherwise a stale callback would save the
    // next document straight back into the anonymous slot.
    storeRef.current = SERVER_STORE;
    // The local copy is the normal source here, but the editor also works when
    // storage is unavailable (Safari private mode) — in that case the document
    // only ever existed in memory, and `currentDocIdRef` is all there is to
    // hand over. Both are the same document; the stored one just carries the
    // id and the custom title from earlier boots.
    const anon = loadAnonDocument();
    const id = anon ? anon.id : currentDocIdRef.current;
    if (id) {
      try {
        // `code` rather than anon.code: the canvas may be a few keystrokes
        // ahead of the debounced local save, and the visitor means the diagram
        // in front of them, not the one on disk.
        setDocs(await SERVER_STORE.save(id, code, t.documents.untitled));
        // The pointer PUT is a no-op server-side until the document row
        // exists, so the document is saved first, as in the boot path.
        await SERVER_STORE.setCurrent(id);
        currentDocIdRef.current = id;
        setCurrentDocId(id);
        loadedCodeRef.current = code;
        clearAnonDocument();
      } catch {
        // Signing in still succeeded. The local document stays where it is,
        // and the next autosave retries the handover under the same id.
      }
    }
    pending?.();
  }

  // The gate is only ever raised by an explicit action now (a second document,
  // or the prompt at the end of the document list), so nothing here opens it.
  // What remains is the exit path: any CONTENT_OPEN — the logo,
  // Features/Guides, or a language switch remounting the window — must drop
  // the gate and whatever action was waiting behind it, or it would hang over
  // the marketing page it just brought back.
  useEffect(() => {
    const close = () => {
      pendingAuthRef.current = null;
      setAuthOpen(false);
    };
    window.addEventListener(CONTENT_OPEN_EVENT, close);
    return () => window.removeEventListener(CONTENT_OPEN_EVENT, close);
  }, []);

  // The gate cannot be dismissed into the editor — the way out is back to the
  // content window (which drops whatever action waited behind it). The
  // document list, when that is where the gate was raised from, is closed too:
  // it is a modal over the editor, and leaving it up would park it on top of
  // the marketing window that just came back.
  function closeAuthAndReturn() {
    pendingAuthRef.current = null;
    setAuthOpen(false);
    setOpenOpen(false);
    requestContentOpen();
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
    // Synchronous, not debounced: every keystroke in the code sheet re-imports
    // immediately, and the diagram recentres on the result.
    if (text === lastVisualCodeRef.current) return;
    setImportText(text);
    setImportSeq((n) => n + 1);
    setRecenterSeq((n) => n + 1);
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
        setDocs(await storeRef.current.save(currentDocIdRef.current, code, t.documents.untitled));
      } catch {
        // Best-effort flush; the switch still proceeds even if storage is down.
      }
    }
    currentDocIdRef.current = id;
    setCurrentDocId(id);
    storeRef.current.setCurrent(id).catch(() => {});
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

  // The document on screen is saved before a new, blank one is created and
  // opened — nothing is lost, it is just no longer the one in front of you.
  // `flush: false` only when called after the current document was just
  // deleted (see confirmDeleteDocument).
  async function startNewDocument({ flush = true } = {}) {
    clearTimeout(docSaveDebounceRef.current);
    if (flush && currentDocIdRef.current && code !== loadedCodeRef.current) {
      try {
        setDocs(await storeRef.current.save(currentDocIdRef.current, code, t.documents.untitled));
      } catch {
        // Best-effort flush; the switch still proceeds even if storage is down.
      }
    }
    const seedCode = toMermaid(defaultState(t));
    const id = newDocumentId();
    let list;
    try {
      // POST the new row BEFORE the current-document pointer PUT: the server
      // only records a current id whose document row already exists, so
      // saving the pointer first would silently keep the previous document.
      list = await storeRef.current.save(id, seedCode, t.documents.untitled);
    } catch {
      list = [{ id, title: t.documents.untitled, code: seedCode, updatedAt: Date.now() }];
    }
    currentDocIdRef.current = id;
    setCurrentDocId(id);
    setDocs(list);
    storeRef.current.setCurrent(id).catch(() => {});
    loadedCodeRef.current = seedCode;
    seedCodeRef.current = seedCode;
    setCode(seedCode);
    lastVisualCodeRef.current = seedCode;
    setImportText(seedCode);
    setImportSeq((n) => n + 1);
    setOpenOpen(false);
  }

  // "Create new" means different things to different visitors. A signed-in one
  // just gets another document in their account. An anonymous one has a single
  // slot: replacing the untouched starter diagram in it costs nothing and must
  // not send a first-time visitor to a sign-in gate, but replacing real work is
  // exactly the moment to offer the account that would let both exist.
  function requestNewDocument() {
    if (authed || code === seedCodeRef.current) startNewDocument();
    else requireAuth(() => startNewDocument());
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
          next = await storeRef.current.remove(doc.id);
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
          setDocs(await storeRef.current.rename(doc.id, value.trim()));
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
    // Appended last on purpose: onDownload below picks these rows by index, so
    // inserting anywhere earlier would silently repoint the taskbar's Download
    // menu at the wrong exporter.
    { icon: "🌐", label: t.text.downloadHtml, run: () => runExport(exporters.downloadHtml, t.text.statusSaved, "Download html") },
  ];

  // The taskbar (a separate tree) acts on the open diagram through window
  // events: Download / Copy open context menus there, Edit Code opens this
  // sheet, Documents opens the list. None of them needs an account any more —
  // the only action that does is creating a SECOND document, which is decided
  // in requestNewDocument.
  useEffect(() => {
    const onDownload = (e) => {
      const kind = e?.detail?.kind;
      const action = { mermaid: exportActions[1], md: exportActions[2], svg: exportActions[4], png: exportActions[5], html: exportActions[6] }[kind];
      if (action) action.run();
    };
    const onCopy = () => exportActions[0].run();
    const onCode = () => setCodeOpen(true);
    const onOpenDocs = () => setOpenOpen(true);
    const onNewDoc = () => requestNewDocument();
    window.addEventListener(EDITOR_DOWNLOAD_EVENT, onDownload);
    window.addEventListener(EDITOR_COPY_EVENT, onCopy);
    window.addEventListener(EDITOR_CODE_EVENT, onCode);
    window.addEventListener(EDITOR_OPEN_DOCS_EVENT, onOpenDocs);
    window.addEventListener(EDITOR_NEW_DOC_EVENT, onNewDoc);
    return () => {
      window.removeEventListener(EDITOR_DOWNLOAD_EVENT, onDownload);
      window.removeEventListener(EDITOR_COPY_EVENT, onCopy);
      window.removeEventListener(EDITOR_CODE_EVENT, onCode);
      window.removeEventListener(EDITOR_OPEN_DOCS_EVENT, onOpenDocs);
      window.removeEventListener(EDITOR_NEW_DOC_EVENT, onNewDoc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, authed, exportActions]);

  return (
    <div className="iqm-root app">
      <main className="app-main">
        {ready && (
          <VisualEditor
            onCodeChange={handleVisualCode}
            importText={importText}
            importSeq={importSeq}
            themeSeq={themeSeq}
            recenterSeq={recenterSeq}
            codeOnly={codeOnly}
            t={t}
          />
        )}
      </main>

      {authOpen &&
        createPortal(
          <AuthGate t={t} onAuthed={handleAuthed} onBack={closeAuthAndReturn} />,
          document.body,
        )}
      {codeOpen &&
        createPortal(
          <CodeModal code={code} onChange={handleTextChange} onClose={() => setCodeOpen(false)} t={t} />,
          document.body,
        )}
      {openOpen &&
        createPortal(
          <div className="modal-backdrop" onPointerDown={() => setOpenOpen(false)}>
            <div className="modal-panel" onPointerDown={(e) => e.stopPropagation()}>
              <div className="modal-title">{t.modals.openTitle}</div>
              {!authed && <div className="modal-empty">{t.documents.anonNote}</div>}
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
                      <Pencil size={18} strokeWidth={2} />
                    </button>
                    <button
                      className="modal-list-delete danger"
                      title={t.documents.delete}
                      aria-label={t.documents.delete}
                      onClick={() => confirmDeleteDocument(d)}
                    >
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  </div>
                ))}
                {/* The anonymous visitor's one slot, made explicit: this row
                    is not a document, it is the way past the limit. It closes
                    the list first so the gate does not open on top of it. */}
                {!authed && (
                  <button
                    type="button"
                    className="modal-list-btn modal-list-locked"
                    onClick={() => {
                      analytics.track("Click", "Sign in for more documents");
                      setOpenOpen(false);
                      requireAuth(() => {});
                    }}
                  >
                    <span className="modal-list-title">{t.documents.anonMore}</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
      {docAsk && createPortal(<AskModal ask={docAsk} onClose={() => setDocAsk(null)} t={t} />, document.body)}
    </div>
  );
}

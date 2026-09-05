"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { EditorTexts } from "./texts";
import {
  EDITOR_CODE_EVENT,
  EDITOR_COPY_EVENT,
  EDITOR_DOWNLOAD_EVENT,
  EDITOR_NEW_DOC_EVENT,
  EDITOR_OPEN_DOCS_EVENT,
  EDITOR_READY_EVENT,
  EDITOR_REVEAL_EVENT,
  hasEditorRevealed,
} from "../_landing/desktop/editor-events";

// mermaid is ~500 kB and touches `document` at import time, so the whole
// editor is client-only and loaded on demand. Because the editor is now a
// shared *background* layer on every marketing page (under the closable
// window), it is mounted lazily after hydration — SSR never pays for it.
const EditorShell = dynamic(() => import("./EditorShell.jsx"), {
  ssr: false,
  loading: () => <div className="editor-loading" />,
});

type AuthState = { status: "loading" } | { status: "anon" } | { status: "authed"; email: string };

// Taskbar actions that act on the open diagram. While the shell has not booted
// (or is still booting) they are queued instead of dropped, and replayed once
// EditorShell announces EDITOR_READY_EVENT — that keeps a first click on
// Documents/Export/… working even though the editor no longer boots at page
// load. EDITOR_CODE_EVENT opens the code sheet; the rest go through the
// shell's own requireAuth flow.
const ACTION_EVENTS = [
  EDITOR_DOWNLOAD_EVENT,
  EDITOR_COPY_EVENT,
  EDITOR_CODE_EVENT,
  EDITOR_OPEN_DOCS_EVENT,
  EDITOR_NEW_DOC_EVENT,
];

// The editor is open to everyone now: the canvas renders for anonymous
// visitors too. Sign-in gates only the actions that persist or export —
// new/open/save/copy/download — which the shell triggers via `requireAuth`.
export function EditorClient({ t }: { t: EditorTexts }) {
  // Whether the editor has ever been revealed (or an editor action was fired).
  // The editor hides *under* the marketing window, invisible and inert, so on
  // a plain page load it must not boot at all: mounting EditorShell pulls in
  // mermaid (~1 MB) and eats main-thread time for a canvas nobody sees — that
  // showed up as multi-second TTI/TBT and ~1.2 MB of scripts on every landing.
  // Boot lazily on the first reveal and keep the shell alive afterwards, so
  // every later reveal (client navigation included) is still instant.
  const [booted, setBooted] = useState<boolean>(() => hasEditorRevealed());
  // EditorShell dispatches EDITOR_READY_EVENT when its first boot resolved;
  // only from then on are its window listeners guaranteed live.
  const [shellReady, setShellReady] = useState(false);
  const bootedRef = useRef(booted);
  const pendingActionsRef = useRef<{ type: string; detail?: unknown }[]>([]);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    bootedRef.current = booted;
  }, [booted]);

  useEffect(() => {
    const onReveal = () => setBooted(true);
    window.addEventListener(EDITOR_REVEAL_EVENT, onReveal);
    return () => window.removeEventListener(EDITOR_REVEAL_EVENT, onReveal);
  }, []);

  useEffect(() => {
    const onReady = () => setShellReady(true);
    window.addEventListener(EDITOR_READY_EVENT, onReady);
    return () => window.removeEventListener(EDITOR_READY_EVENT, onReady);
  }, []);

  // Queue action events that arrive before the shell is listening. Firing one
  // also marks the editor as wanted, so it boots even if the window is still
  // open (the shell's own requireAuth then decides whether to reveal — it
  // closes the window for anonymous visitors, exactly as when it was mounted
  // from page load).
  useEffect(() => {
    if (shellReady) return;
    const onAction = (e: Event) => {
      pendingActionsRef.current.push({
        type: e.type,
        detail: (e as CustomEvent<unknown>).detail,
      });
      if (!bootedRef.current) setBooted(true);
    };
    for (const type of ACTION_EVENTS) window.addEventListener(type, onAction);
    return () => {
      for (const type of ACTION_EVENTS) window.removeEventListener(type, onAction);
    };
  }, [shellReady]);

  // Replay the queued actions exactly once, after the shell has reported
  // ready. setTimeout keeps the replay off the boot's critical path.
  useEffect(() => {
    if (!shellReady) return;
    const pending = pendingActionsRef.current;
    if (pending.length === 0) return;
    pendingActionsRef.current = [];
    const timer = setTimeout(() => {
      for (const p of pending) {
        window.dispatchEvent(new CustomEvent(p.type, { detail: p.detail }));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [shellReady]);

  useEffect(() => {
    if (!booted) return;
    let cancelled = false;
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAuth(d.authenticated ? { status: "authed", email: d.email } : { status: "anon" });
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: "anon" });
      });
    return () => {
      cancelled = true;
    };
  }, [booted]);

  const handleAuthed = useCallback((email: string) => setAuth({ status: "authed", email }), []);

  // Not revealed (yet): nothing to mount — the marketing page stays the only
  // actor on the main thread. Once booted, hold the loading screen until the
  // auth check resolves; the editor itself never swaps to a full-page gate.
  if (!booted) return null;
  if (auth.status === "loading") return <div className="editor-loading" />;
  return (
    <EditorShell t={t} authed={auth.status === "authed"} onAuthed={handleAuthed} />
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { EditorTexts } from "./texts";

// mermaid is ~500 kB and touches `document` at import time, so the whole
// editor is client-only and loaded on demand. Because the editor is now a
// shared *background* layer on every marketing page (under the closable
// window), it is mounted lazily after hydration — SSR never pays for it.
const EditorShell = dynamic(() => import("./EditorShell.jsx"), {
  ssr: false,
  loading: () => <div className="editor-loading" />,
});

type AuthState = { status: "loading" } | { status: "anon" } | { status: "authed"; email: string };

// The editor is open to everyone now: the canvas renders for anonymous
// visitors too. Sign-in gates only the actions that persist or export —
// new/open/save/copy/download — which the shell triggers via `requireAuth`.
export function EditorClient({ t }: { t: EditorTexts }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
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
  }, []);

  const handleAuthed = useCallback((email: string) => setAuth({ status: "authed", email }), []);

  // The shell needs the resolved state (authed vs not) and both transitions.
  // While the initial check is in flight we hold the loading screen; the
  // editor itself never swaps to a full-page gate.
  if (auth.status === "loading") return <div className="editor-loading" />;
  return (
    <EditorShell t={t} authed={auth.status === "authed"} onAuthed={handleAuthed} />
  );
}

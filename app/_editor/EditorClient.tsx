"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { EditorTexts } from "./texts";
import AuthGate from "./AuthGate.jsx";

// mermaid is ~500 kB and touches `document` at import time, so the whole
// editor is client-only and loaded on demand. The gate below adds a second
// reason to keep it lazy: a signed-out visitor never pulls the mermaid chunk —
// they only ever see AuthGate. Everything outside /app never pulls it at all.
const EditorShell = dynamic(() => import("./EditorShell.jsx"), {
  ssr: false,
  loading: () => <div className="editor-loading" />,
});

type AuthState = { status: "loading" } | { status: "anon" } | { status: "authed"; email: string };

export function EditorClient({
  t,
  homeHref,
  brand,
}: {
  t: EditorTexts;
  homeHref: string;
  brand: string;
}) {
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

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the network drops, drop the local gate — the cookie is the
      // source of truth and the next check will bounce anyway.
    }
    setAuth({ status: "anon" });
  }, []);

  if (auth.status === "loading") return <div className="editor-loading" />;
  if (auth.status === "anon") return <AuthGate t={t} homeHref={homeHref} brand={brand} onAuthed={handleAuthed} />;
  return <EditorShell t={t} homeHref={homeHref} email={auth.email} onSignOut={handleSignOut} />;
}

"use client";

import dynamic from "next/dynamic";
import type { EditorTexts } from "./texts";

// mermaid is ~500 kB and touches `document` at import time, so the whole
// editor is client-only and loaded on demand. Everything outside /app —
// the marketing pages, the blog — never pulls this chunk.
const EditorShell = dynamic(() => import("./EditorShell.jsx"), {
  ssr: false,
  loading: () => <div className="editor-loading" />,
});

export function EditorClient({ t, homeHref }: { t: EditorTexts; homeHref: string }) {
  return <EditorShell t={t} homeHref={homeHref} />;
}

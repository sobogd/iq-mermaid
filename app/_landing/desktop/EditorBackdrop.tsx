"use client";

import dynamic from "next/dynamic";
import type { EditorTexts } from "@/app/_editor/texts";
import { SafeArea } from "./SafeArea";

// The editor is a heavy client-only bundle (mermaid ~500 kB, touches `document`
// at import). It is now the shared background layer of the desktop on every
// marketing page: lazy-loaded after hydration so SSR never pays for it, and
// rendered UNDER the closable content window — close the window and the already
// booted editor is revealed. `ssr:false` + the dynamic import keep the whole
// editor out of the initial payload.
//
// SafeArea: the editor shares the page's React root, so a crash inside it must
// never take the marketing UI down with it — the boundary keeps an editor
// failure local to this desktop layer (see SafeArea).
const EditorClient = dynamic(() => import("@/app/_editor/EditorClient").then((m) => m.EditorClient), {
  ssr: false,
  loading: () => null,
});

// Renders the editor across the whole desktop area, one level below the
// marketing window (which the DesktopShell stacks above it). The editor's own
// chrome is its left dock island, always visible above everything.
export function EditorBackdrop({ texts }: { texts: EditorTexts }) {
  return (
    <div className="absolute inset-0 z-0" aria-hidden="false">
      <SafeArea>
        <EditorClient t={texts} />
      </SafeArea>
    </div>
  );
}

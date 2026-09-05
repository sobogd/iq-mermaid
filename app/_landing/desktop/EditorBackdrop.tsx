"use client";

import dynamic from "next/dynamic";
import EditorDock from "@/app/_editor/EditorDock";
import type { EditorTexts } from "@/app/_editor/texts";
import { SafeArea } from "./SafeArea";

// The editor is a heavy client-only bundle (mermaid ~500 kB, touches `document`
// at import). It is the shared background layer of the desktop on every
// marketing page, rendered UNDER the closable content window — close the
// window and the editor is revealed. `ssr:false` + the dynamic import keep the
// whole editor out of the initial payload, and EditorClient additionally
// defers the editor's boot until the first reveal (or editor action): visitors
// who never open the editor never download or execute mermaid, so the landing's
// Lighthouse/Core-Web-Vitals are not hostage to the editor's main-thread cost.
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
//
// While the marketing window is open the editor is fully COVERED by it, so the
// layer starts `inert` + `aria-hidden`: its duplicate <main>/toolbar must not
// leak into the tab order or the accessibility tree of the marketing page.
// AppWindow removes both the moment the window closes (the editor revealed).
export function EditorBackdrop({ texts }: { texts: EditorTexts }) {
  return (
    <div data-editor-layer inert aria-hidden="true" className="absolute inset-0 z-0">
      <SafeArea>
        {/* The dock is light and eager: its buttons appear on every marketing
            page (portaled onto <body>), while the mermaid canvas stays behind
            EditorClient's lazy boundary and only boots on the first reveal. */}
        <EditorDock t={texts} />
        <EditorClient t={texts} />
      </SafeArea>
    </div>
  );
}

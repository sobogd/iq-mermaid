"use client";

// Persistent desktop chrome: the wallpaper and the shared editor background.
// Rendered once by the locale layout (NOT by each page), so it survives client
// navigation between pages of the same locale and the editor is never remounted
// (which used to make the diagram flash / jump). The per-page `DesktopShell`
// stacks the taskbar and the closable window on top of this layer.
import { EditorBackdrop } from "./EditorBackdrop";
import { EDITOR } from "@/content";
import type { Locale } from "@/lib/locales";

export function DesktopChrome({ locale }: { locale: Locale }) {
  const texts = EDITOR[locale] ?? EDITOR.en;
  return (
    <>
      <div className="desktop-wallpaper" aria-hidden="true" />
      <EditorBackdrop texts={texts} />
    </>
  );
}

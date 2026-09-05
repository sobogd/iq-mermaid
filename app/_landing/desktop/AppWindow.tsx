"use client";

import { useEffect, useRef, useState } from "react";
import { CONTENT_OPEN_EVENT, isTaskbarMenuOpen, setContentWindowOpen } from "./editor-events";

// Page-level event used by the "Open editor" buttons on every page: closing the
// window reveals the already-booted editor underneath, anywhere in the site.
export const OPEN_EDITOR_EVENT = "iqm:open-editor";

// PostHog's AppWindow: a glass rectangle floating over the desktop, its content
// scrolling *inside* the window rather than the page. There is deliberately no
// close control here — "Open editor" is available from the header/menu and
// every CTA, and a press on the desktop around the window closes it too.
//
//  - Open editor: closes the marketing window and the shared editor underneath
//    takes the whole desktop.
//  - Header logo / Features / Guides (requestContentOpen) re-open the window,
//    so the content part always comes back even while the editor is showing.
//  - Click-away: while the window is open, any pointer-down that lands outside
//    the window (not on the taskbar, the editor dock, or a modal) closes it on
//    that first click and does NOT reach the editor.
//
// The window body scrolls internally: the outer shell puts the scrolling area
// here and each page hands the *marketing sections* as children, so
// hero/features/FAQ all live inside one scroll region.
export function AppWindow({ children }: { children: React.ReactNode }) {
  const [closed, setClosed] = useState(false);
  // Ref to the window surface so the click-away handler can tell "inside".
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Closing the window reveals the shared editor underneath — which is now
  // sign-in-first: the state broadcast below lets the editor raise its auth
  // gate for anonymous visitors, whatever path closed the window.
  const reveal = () => setClosed(true);

  // "Open editor" buttons anywhere dispatch this to close the window. A
  // click-delegated listener also catches inline `app:` links rendered inside
  // blog copy (they carry `[data-iqm-open-editor]`), so those collapse the
  // window too instead of navigating away.
  useEffect(() => {
    const open = () => reveal();
    const onClick = (e: Event) => {
      const el = (e.target as HTMLElement).closest?.("[data-iqm-open-editor]");
      if (el) {
        e.preventDefault();
        reveal();
      }
    };
    window.addEventListener(OPEN_EDITOR_EVENT, open);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener(OPEN_EDITOR_EVENT, open);
      document.removeEventListener("click", onClick);
    };
  }, []);

  // Header links (logo, Features, Guides) ask for the content part back: even
  // with the editor open and a same-page link (logo → home) that does not
  // remount the window, the content window reappears.
  useEffect(() => {
    const openContent = () => setClosed(false);
    window.addEventListener(CONTENT_OPEN_EVENT, openContent);
    return () => window.removeEventListener(CONTENT_OPEN_EVENT, openContent);
  }, []);

  // Click-away, in the capture phase so it wins over the editor's own handlers:
  // the first outside press only closes the window, it never reaches the
  // canvas. Ignore presses on the window itself, the top taskbar, the editor
  // dock (and the interactive chrome they contain), and any open modal. While a
  // taskbar context menu is open, the menu owns the outside press (see Taskbar),
  // so this must not close the window.
  useEffect(() => {
    if (closed) return;
    const onPointerDown = (e: PointerEvent) => {
      if (isTaskbarMenuOpen()) return;
      const t = e.target as HTMLElement;
      if (surfaceRef.current?.contains(t)) return;
      if (t.closest?.("#top, .iqm-dock, .modal-backdrop, .code-modal-backdrop")) return;
      // Editor's own buttons are inside .iqm-dock, covered above. Anything
      // else outside the window: close it.
      e.preventDefault();
      e.stopPropagation();
      reveal();
    };
    // capture: true runs before the canvas/editor listeners.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [closed]);

  // Single source of truth for "is the content window open?": on every change
  // of `closed` (including the initial open state after a client navigation
  // remounts this window) broadcast to the editor layer and reflect it on
  // <html>, so the dock rails and the auth gate always see the current state.
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("iqm-editor-revealed", closed);
    setContentWindowOpen(!closed);
  }, [closed]);

  if (closed) return null;

  return (
    <div
      ref={surfaceRef}
      className="window-glass pointer-events-auto relative flex size-full flex-col overflow-hidden rounded-lg"
    >
      {/* Body scrolls internally. Fade the top so content melts under the
          window's top edge. */}
      <div className="window-scroll size-full flex-1">
        <div className="min-h-full">{children}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { Taskbar, type TaskbarTexts } from "./Taskbar";
import { AppWindow } from "./AppWindow";
import { LogoIcon } from "../LogoIcon";
import type { Locale } from "@/lib/locales";

// The PostHog desktop: the fixed wallpaper + the shared editor live at the
// layout level (see DesktopChrome / (en)-layout), so they survive navigation.
// This shell just stacks the floating glass taskbar "island" on top and the
// page's content inside a closable, internally-scrolling AppWindow.
//
// Because AppWindow is a client component (window close state), the marketing
// sections are passed as children across the server/client boundary.
export function DesktopShell({
  headerTexts,
  locale,
  homeHref,
  showBrand = false,
  children,
}: {
  headerTexts?: TaskbarTexts;
  locale?: Locale;
  homeHref?: string;
  /** Whether the content window leads with the brand row (icon + word). Only
   *  the home page shows it — inner pages start with their own heading. */
  showBrand?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="pointer-events-none relative flex h-dvh flex-col overflow-hidden">
      {/* Floating island taskbar, above the wallpaper and the editor. */}
      <div className="pointer-events-auto relative z-30">
        <Taskbar homeHref={homeHref} locale={locale} texts={headerTexts} />
      </div>

      {/* The desktop canvas the window floats in. It is the page's <main>: the
          actual content is what the window shows, while the floating taskbar
          above stays a sibling <header> landmark instead of being nested
          inside it. The canvas wrapper and its 1000px box are pointer-events-
          none too: clicks pass straight through to the editor layer (from the
          layout-level DesktopChrome) below, and the floating window itself
          (which sets pointer-events-auto) is the only thing in this area that
          catches them. When the window is closed it returns null, so the whole
          area stays a no-op for clicks. */}
      <main className="pointer-events-none relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-6 sm:pb-5">
        {/* Mobile: the window fills the whole strip under the header, so the
            gap header → window matches the 8px side insets (the header's own
            p-2 already provides the top 8px). From sm up it floats centred in
            the canvas with its 96% height and a soft gap. */}
        <div className="pointer-events-none h-full w-full max-w-[1000px] sm:h-[96%]">
          <AppWindow>
            {/* The full brand mark (icon + word) lives at the top of the home
                window content, as PostHog does — the taskbar above keeps only
                the small rounded "IQ" square. Inner pages don't repeat it. */}
            {showBrand && (
              <div className="flex items-center gap-1.5 px-6 pt-6 sm:px-8">
                <Link
                  href={homeHref ?? "/"}
                  className="inline-flex shrink-0 items-center gap-1.5 text-lg font-semibold tracking-tight sm:text-xl"
                  aria-label={headerTexts?.logo ?? "IQ Mermaid"}
                >
                  <LogoIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                  {headerTexts?.logo ?? "Mermaid"}
                </Link>
              </div>
            )}
            {children}
          </AppWindow>
        </div>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { NARROW, PRIMARY_BTN, OUTLINE_BTN } from "./_landing/shell";
import { READY_LOCALES } from "@/content";
import { LOCALE_NAMES } from "@/lib/locale-names";
import { localeHome } from "@/lib/locale-paths";
import { BRAND } from "@/lib/site";

// This page owns its own <html>/<body>: the root layout deliberately renders
// bare children (each locale's layout supplies the document shell), and
// not-found renders under the ROOT layout, so without this the 404 has no
// document element at all.
//
// English-only on purpose. Next serves one root not-found for every unmatched
// path, and an unmatched path has no locale to read. The language list below
// is the way out for everyone else.

export const metadata: Metadata = {
  title: `Page not found — ${BRAND}`,
  // A 404 already carries the status code; the directive keeps it out of the
  // index if anything ever links to one.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className={`${NARROW} flex flex-1 flex-col justify-center gap-8 py-16`}>
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-hint">404</p>
            <h1 className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-[2.5rem]">
              This page doesn&apos;t exist{" "}
              <span className="text-button">— the editor does</span>
            </h1>
            <p className="max-w-[60ch] text-sm leading-relaxed text-hint/80 sm:text-base">
              The address you followed isn&apos;t a page here. Open the editor and start a
              diagram, or read one of the guides.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/app" className={PRIMARY_BTN}>
              Open the editor
            </Link>
            <Link href="/blog" className={OUTLINE_BTN}>
              Guides
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-hint">Languages</p>
            <nav className="flex flex-wrap gap-x-4 gap-y-2">
              {READY_LOCALES.map((l) => (
                <Link
                  key={l}
                  href={localeHome(l)}
                  className="text-sm text-hint transition-colors hover:text-text"
                >
                  {LOCALE_NAMES[l] ?? l}
                </Link>
              ))}
            </nav>
          </div>
        </main>
      </body>
    </html>
  );
}

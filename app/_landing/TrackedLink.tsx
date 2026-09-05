"use client";

import Link from "next/link";
import { analytics } from "@/lib/analytics";

// Plain <a> that reports its click. Exists so server components (the footer)
// can carry tracked links without becoming client components themselves — the
// only thing that ships to the browser is this handler.
//
// Ported from translator's app/_landing/TrackedLink.tsx.
export function TrackedLink({
  href,
  track,
  className,
  children,
  openEditor = false,
}: {
  href: string;
  /** Event name, locale-stable (route key / slug, never a translated label). */
  track: string;
  className?: string;
  children: React.ReactNode;
  /** Set for links that should collapse the marketing window (reveal the
   *  shared editor) instead of navigating — `AppWindow`'s click delegate
   *  listens for `[data-iqm-open-editor]`. */
  openEditor?: boolean;
}) {
  return (
    <a
      href={openEditor ? "#" : href}
      data-iqm-open-editor={openEditor ? "true" : undefined}
      className={className}
      onClick={() => {
        analytics.track("Click", track);
        // A footer link is a full document navigation: the 2s buffer would
        // never get to send it.
        analytics.flush();
      }}
    >
      {children}
    </a>
  );
}

/** Same idea for in-app navigation: keeps Next's client-side routing (so no
 *  flush — the document survives the click) and only adds the event. */
export function TrackedNavLink({
  href,
  track,
  className,
  children,
}: {
  href: string;
  track: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => analytics.track("Click", track)}>
      {children}
    </Link>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, type Locale } from "@/lib/locales";
import { localeHome } from "@/lib/locale-paths";

// Next.js 16 renamed the `middleware` file convention to `proxy`. Only one
// per project, so the whole edge-side routing lives in this function.
//
// Language routing only. Accounts/sessions now live in /api route handlers and
// are gated client-side in the editor, not here — this function still just
// sends a first-time visitor to their own language.

function isAssetPath(pathname: string): boolean {
  return pathname.startsWith("/_next") || /\.[a-zA-Z0-9]+$/.test(pathname);
}

// Accept-Language only. This domain sits directly behind nginx with no CDN in
// front, and the geo headers nginx forwards describe the network, not the
// reader's language.
function detectLocale(req: NextRequest): Locale {
  const header = req.headers.get("accept-language") ?? "";
  const preferred = header.split(",")[0]?.split("-")[0]?.toLowerCase();
  return (locales as readonly string[]).includes(preferred ?? "") ? (preferred as Locale) : defaultLocale;
}

// These roots are language-routed. /privacy and /terms exist in every locale
// (under /<locale>/privacy & /<locale>/terms with the English version at the
// root), so a non-English visitor is sent to their prefix; anything else
// unprefixed is simply not a page — redirecting those would turn one 404 into
// a 302 + 404 chain.
const ROUTED = ["/", "/privacy", "/terms"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // English lives unprefixed at the root, but /en/<slug> would render the same
  // page a second time (the [seg] routes happily match seg="en"). Send it to
  // the canonical form permanently.
  if (!isAssetPath(pathname) && (pathname === "/en" || pathname.startsWith("/en/"))) {
    const stripped = pathname.slice(3) || "/";
    const redirectUrl = new URL(stripped, req.url);
    redirectUrl.search = req.nextUrl.search;
    return NextResponse.redirect(redirectUrl, 301);
  }

  // /app no longer exists as a page: the editor is the shared background under
  // the window on every page, so the old dedicated route rolls back to the
  // locale home (there are no /<locale>/app variants to map either). Preserve
  // the deep-link query (e.g. ?demo=) for safety.
  if (!isAssetPath(pathname) && (pathname === "/app" || pathname.startsWith("/app/"))) {
    const redirectUrl = new URL(localeHome(detectLocale(req)), req.url);
    redirectUrl.search = req.nextUrl.search;
    return NextResponse.redirect(redirectUrl, 302);
  }

  if (ROUTED.includes(pathname)) {
    const target = detectLocale(req);
    if (target !== defaultLocale) {
      const redirectUrl = new URL(`/${target}${pathname === "/" ? "" : pathname}`, req.url);
      redirectUrl.search = req.nextUrl.search;
      const response = NextResponse.redirect(redirectUrl, 302);
      // The response varies by the header the choice is made from — without
      // this any shared cache would serve one visitor's language to the next.
      response.headers.set("Vary", "Accept-Language");
      return response;
    }
    const res = NextResponse.next();
    res.headers.set("Vary", "Accept-Language");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

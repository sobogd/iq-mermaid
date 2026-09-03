import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, type Locale } from "@/lib/locales";

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

// Paths that only ever exist in English. Without this list the language
// redirect below would send a German visitor from /privacy to /de/privacy,
// which is a 302 into a 404.
const EN_ONLY_PATHS = ["/privacy", "/terms"];

// Only these two roots are language-routed. Everything else unprefixed is
// either English-only or simply not a page — redirecting those would turn one
// 404 into a 302 + 404 chain.
const ROUTED = ["/", "/app"];

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

  if (ROUTED.includes(pathname) && !EN_ONLY_PATHS.includes(pathname)) {
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

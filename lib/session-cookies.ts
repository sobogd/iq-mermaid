// The auth cookie pair. `iqm_session` is the httpOnly token; `iqm_email` is a
// non-httpOnly mirror so the UI can show who's signed in without a round trip.
// Host-only (no domain attr): the app lives on one origin, iq-mermaid.com.
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "iqm_session";
export const EMAIL_COOKIE = "iqm_email";

// Longest max-age browsers honour (Chrome clamps higher values), so a session
// effectively lives until an explicit logout.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function options(httpOnly: boolean) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function setSessionCookies(res: NextResponse, token: string, email: string): void {
  res.cookies.set(SESSION_COOKIE, token, options(true));
  res.cookies.set(EMAIL_COOKIE, email, options(false));
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { ...options(true), maxAge: 0 });
  res.cookies.set(EMAIL_COOKIE, "", { ...options(false), maxAge: 0 });
}

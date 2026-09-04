// The auth cookie. `iqm_session` is the httpOnly token; the signed-in email is
// read back from the DB by /api/auth/check rather than mirrored in a readable
// cookie, so there is no second cookie to keep in sync or leak to page scripts.
// Host-only (no domain attr): the app lives on one origin, iq-mermaid.com.
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "iqm_session";

// Longest max-age browsers honour (Chrome clamps higher values), so a session
// effectively lives until an explicit logout.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function options() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function setSessionCookies(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, options());
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { ...options(), maxAge: 0 });
}

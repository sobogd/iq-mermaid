// Session resolution for route handlers: read the httpOnly session cookie,
// hash it, and look the session up. Returns the owning user id or null.
import type { NextRequest } from "next/server";
import { ensureSchema, pool } from "./db";
import { hashToken } from "./otp";
import { SESSION_COOKIE } from "./session-cookies";

export async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const { rows } = await pool().query(
    `SELECT user_id FROM sessions
     WHERE token_hash = $1 AND (expires_at IS NULL OR expires_at > now())`,
    [hashToken(token)],
  );
  return rows[0]?.user_id ?? null;
}

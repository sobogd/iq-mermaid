import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, pool } from "@/lib/db";
import { hashToken } from "@/lib/otp";
import { clearSessionCookies } from "@/lib/session-cookies";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("iqm_session")?.value;
  if (token) {
    await ensureSchema();
    await pool().query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]).catch(() => undefined);
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}

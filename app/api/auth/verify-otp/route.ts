import { NextResponse } from "next/server";
import { ensureSchema, pool } from "@/lib/db";
import { generateToken, hashOTP, hashToken, MAX_OTP_ATTEMPTS, safeCompare } from "@/lib/otp";
import { normalizeEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { setSessionCookies } from "@/lib/session-cookies";

export const dynamic = "force-dynamic";

const VERIFY_LIMIT_WINDOW = 15 * 60 * 1000;
const VERIFY_LIMIT_MAX = 10;
const VERIFY_IP_MAX = 60;

export async function POST(req: Request) {
  let body: { email?: unknown; code?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Invalid JSON — fall through to the missing-fields path below.
  }

  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }

  if (rateLimit(`verify:${email}`, VERIFY_LIMIT_MAX, VERIFY_LIMIT_WINDOW)) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }
  if (rateLimit(`verify:ip:${clientIp(req.headers)}`, VERIFY_IP_MAX, VERIFY_LIMIT_WINDOW)) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }

  await ensureSchema();
  const user = (await pool().query(`SELECT * FROM users WHERE email = $1`, [email])).rows[0];

  if (!user || !user.otp_hash || !user.otp_expires_at) {
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }

  if (user.otp_attempts >= MAX_OTP_ATTEMPTS) {
    await pool().query(
      `UPDATE users SET otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = $1`,
      [user.id],
    );
    return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }

  if (new Date(user.otp_expires_at).getTime() < Date.now()) {
    await pool().query(
      `UPDATE users SET otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = $1`,
      [user.id],
    );
    return NextResponse.json({ ok: false, error: "CODE_EXPIRED" }, { status: 400 });
  }

  if (!safeCompare(String(user.otp_hash), hashOTP(code))) {
    await pool().query(`UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1`, [user.id]);
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);

  await pool().query(
    `UPDATE users SET otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = $1`,
    [user.id],
  );
  await pool().query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NULL)`,
    [tokenHash, user.id],
  );

  const res = NextResponse.json({ ok: true, email: user.email });
  setSessionCookies(res, token);
  return res;
}

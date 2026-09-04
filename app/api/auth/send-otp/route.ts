import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ensureSchema, pool } from "@/lib/db";
import { generateOTP, hashOTP, OTP_EXPIRY_MS } from "@/lib/otp";
import { normalizeEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { sendOtpEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const SEND_LIMIT_WINDOW = 15 * 60 * 1000;
const SEND_LIMIT_MAX = 5;
// Wider per-IP cap: several people can share an IP (NAT/mobile), but a single
// client spraying many DIFFERENT addresses must not be able to dodge the
// per-email limit and abuse SMTP.
const SEND_IP_MAX = 20;

export async function POST(req: Request) {
  let body: { email?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Invalid JSON — fall through to the INVALID_EMAIL path below.
  }

  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  if (!email) {
    return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
  }

  if (rateLimit(`send:${email}`, SEND_LIMIT_MAX, SEND_LIMIT_WINDOW)) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }
  if (rateLimit(`send:ip:${clientIp(req.headers)}`, SEND_IP_MAX, SEND_LIMIT_WINDOW)) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const code = generateOTP();
  const otpHash = hashOTP(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await ensureSchema();
  // Upsert on email: a brand-new visitor gets a fresh user row, a returning one
  // gets a new code on the existing row. The id is minted client-side-ish here
  // (node crypto) so the schema doesn't depend on pgcrypto/gen_random_uuid.
  await pool().query(
    `INSERT INTO users (id, email, otp_hash, otp_expires_at, otp_attempts)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (email) DO UPDATE
       SET otp_hash = EXCLUDED.otp_hash,
           otp_expires_at = EXCLUDED.otp_expires_at,
           otp_attempts = 0`,
    [randomUUID(), email, otpHash, expiresAt],
  );

  // Fire-and-forget: a mail failure must not turn into an auth error, and the
  // response shape is identical whether or not a code was actually emailed, so
  // this doesn't leak which addresses exist.
  void sendOtpEmail(email, code).catch((e) => console.error("[mail] OTP send failed", e));

  return NextResponse.json({ ok: true });
}

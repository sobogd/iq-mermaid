// Crypto helpers for the OTP + session flow. Ported (and trimmed) from
// iq-rest's apps/dashboard-api/src/common/session-utils.ts so the two products
// mint codes and tokens the same way.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;

/** 6-digit code, uniformly distributed over 000000–999999 (well, 100000–999999
 *  after the modulo — the leading zeros only matter for display, which we skip
 *  here by construction). */
export function generateOTP(): string {
  const num = (randomBytes(4).readUInt32BE(0) % 900000) + 100000;
  return num.toString();
}

export function hashOTP(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** 32-byte random session token, given to the browser and never stored raw. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare of two sha256 hex digests. */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

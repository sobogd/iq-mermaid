import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, pool } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ authenticated: false });

  await ensureSchema();
  const user = (await pool().query(`SELECT email FROM users WHERE id = $1`, [userId])).rows[0];
  return NextResponse.json({ authenticated: true, email: user?.email ?? null });
}

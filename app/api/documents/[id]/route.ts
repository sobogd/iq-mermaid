import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteDocument, listDocuments, renameDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

  await deleteDocument(userId, id);
  return NextResponse.json(await listDocuments(userId));
}

/** Rename a document: set the user-chosen title override. An empty value clears
 *  the override so the title falls back to the one derived from the source. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

  let body: { customTitle?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  }

  const raw = typeof body.customTitle === "string" ? body.customTitle : "";
  const trimmed = raw.trim().slice(0, 200);
  await renameDocument(userId, id, trimmed || null);
  return NextResponse.json(await listDocuments(userId));
}

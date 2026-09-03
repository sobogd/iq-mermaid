import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteDocument, listDocuments } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

  await deleteDocument(userId, id);
  return NextResponse.json(await listDocuments(userId));
}

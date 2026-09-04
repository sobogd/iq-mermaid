import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  listDocuments,
  MAX_DOCUMENT_CODE_LENGTH,
  setCurrentDocument,
  TooManyDocumentsError,
  upsertDocument,
} from "@/lib/documents";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

/** The caller's full document list plus which one was open last. */
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return unauthorized();
  return NextResponse.json(await listDocuments(userId));
}

/** Insert or update one document's source; returns the re-sorted full list. */
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return unauthorized();

  let body: { id?: unknown; code?: unknown; title?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const code = typeof body.code === "string" ? body.code : "";
  const title = typeof body.title === "string" ? body.title : "";

  if (!id) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  if (code.length > MAX_DOCUMENT_CODE_LENGTH) {
    return NextResponse.json({ ok: false, error: "TOO_LARGE" }, { status: 413 });
  }

  try {
    await upsertDocument(userId, { id, code, title: title.slice(0, 200) });
  } catch (e) {
    if (e instanceof TooManyDocumentsError) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_DOCUMENTS" }, { status: 400 });
    }
    throw e;
  }
  return NextResponse.json(await listDocuments(userId));
}

/** Remember which document was open last (persisted per account). */
export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return unauthorized();

  let body: { id?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

  await setCurrentDocument(userId, id);
  return NextResponse.json({ ok: true, currentId: id });
}

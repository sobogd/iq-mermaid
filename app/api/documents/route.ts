import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { listDocuments, setCurrentDocument, upsertDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

async function requireUser(req: NextRequest): Promise<{ userId: string } | { res: NextResponse }> {
  const userId = await getSessionUserId(req);
  if (!userId) return { res: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }) };
  return { userId };
}

/** The caller's full document list plus which one was open last. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listDocuments(auth.userId));
}

/** Insert or update one document's source; returns the re-sorted full list. */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("res" in auth) return auth.res;

  let body: { id?: unknown; code?: unknown; title?: unknown; updatedAt?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const code = typeof body.code === "string" ? body.code : "";
  const title = typeof body.title === "string" ? body.title : "";
  const updatedAt = typeof body.updatedAt === "number" && Number.isFinite(body.updatedAt) ? body.updatedAt : NaN;

  if (!id || !Number.isFinite(updatedAt)) {
    return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  }

  await upsertDocument(auth.userId, { id, code, title, updatedAt });
  return NextResponse.json(await listDocuments(auth.userId));
}

/** Remember which document was open last (persisted per account). */
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if ("res" in auth) return auth.res;

  let body: { id?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

  await setCurrentDocument(auth.userId, id);
  return NextResponse.json({ ok: true, currentId: id });
}

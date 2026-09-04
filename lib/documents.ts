// Shared document queries for the /api/documents handlers. `updated_at` is a
// timestamptz in the DB but the editor consumes `updatedAt` as epoch ms, so the
// two are converted at the edge. The timestamp itself is set by the SERVER
// (`now()`), never taken from the client — a client clock can be wrong or
// malicious, and "recently edited" must mean the same thing on every device.
import { ensureSchema, pool } from "./db";

export const MAX_DOCUMENTS_PER_USER = 500;
export const MAX_DOCUMENT_CODE_LENGTH = 1_000_000;

export interface Doc {
  id: string;
  title: string;
  customTitle: string | null;
  code: string;
  updatedAt: number;
}

/** Thrown when inserting a NEW document would push the user over the cap.
 *  The route maps it to a 400; an update to an existing doc never trips it. */
export class TooManyDocumentsError extends Error {
  constructor() {
    super("too many documents");
    this.name = "TooManyDocumentsError";
  }
}

function toDoc(row: {
  id: string;
  title: string;
  custom_title: string | null;
  code: string;
  updated_at: Date;
}): Doc {
  return {
    id: row.id,
    title: row.title,
    customTitle: row.custom_title ?? null,
    code: row.code,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function listDocuments(userId: string): Promise<{ docs: Doc[]; currentId: string | null }> {
  await ensureSchema();
  const docs = (
    await pool().query(
      `SELECT id, title, custom_title, code, updated_at
       FROM documents WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId],
    )
  ).rows.map(toDoc);

  const user = (await pool().query(`SELECT current_document_id FROM users WHERE id = $1`, [userId])).rows[0];
  return { docs, currentId: user?.current_document_id ?? null };
}

/** Insert or update one document. Scoped to the owner: a stale/foreign id can
 *  never overwrite someone else's diagram (the DO UPDATE guard is the belt, the
 *  uuid-from-the-client being practically unguessable is the suspenders). */
export async function upsertDocument(
  userId: string,
  doc: { id: string; code: string; title: string },
): Promise<void> {
  await ensureSchema();

  // Only enforce the cap when this id is NEW for this user — re-saving an
  // existing document must never be rejected.
  const existing = await pool().query(
    `SELECT 1 FROM documents WHERE id = $1 AND user_id = $2`,
    [doc.id, userId],
  );
  if (existing.rowCount === 0) {
    const count = await pool().query(
      `SELECT count(*)::int AS c FROM documents WHERE user_id = $1`,
      [userId],
    );
    if (count.rows[0].c >= MAX_DOCUMENTS_PER_USER) throw new TooManyDocumentsError();
  }

  await pool().query(
    `INSERT INTO documents (id, user_id, title, code, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE
       SET title = EXCLUDED.title,
           code = EXCLUDED.code,
           updated_at = now()
       WHERE documents.user_id = EXCLUDED.user_id`,
    [doc.id, userId, doc.title, doc.code],
  );
}

/** Set (or clear, with null) the user-chosen title override. */
export async function renameDocument(userId: string, id: string, customTitle: string | null): Promise<void> {
  await ensureSchema();
  await pool().query(
    `UPDATE documents SET custom_title = $1 WHERE id = $2 AND user_id = $3`,
    [customTitle, id, userId],
  );
}

export async function deleteDocument(userId: string, id: string): Promise<void> {
  await ensureSchema();
  await pool().query(`DELETE FROM documents WHERE id = $1 AND user_id = $2`, [id, userId]);
  // If the deleted doc was the "currently open" one, drop that pointer too.
  await pool().query(
    `UPDATE users SET current_document_id = NULL WHERE id = $1 AND current_document_id = $2`,
    [userId, id],
  );
}

export async function setCurrentDocument(userId: string, id: string): Promise<void> {
  await ensureSchema();
  await pool().query(
    `UPDATE users SET current_document_id = $1
     WHERE id = $2 AND EXISTS (SELECT 1 FROM documents WHERE id = $1 AND user_id = $2)`,
    [id, userId],
  );
}

// Shared document queries for the /api/documents handlers. `updated_at` is a
// timestamptz in the DB but the editor consumes `updatedAt` as epoch ms (what
// the old localStorage store returned), so the two are converted at the edge.
import { ensureSchema, pool } from "./db";

export interface Doc {
  id: string;
  title: string;
  code: string;
  updatedAt: number;
}

function toDoc(row: { id: string; title: string; code: string; updated_at: Date }): Doc {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function listDocuments(userId: string): Promise<{ docs: Doc[]; currentId: string | null }> {
  await ensureSchema();
  const docs = (await pool().query(
    `SELECT id, title, code, updated_at FROM documents WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId],
  )).rows.map(toDoc);

  const user = (await pool().query(`SELECT current_document_id FROM users WHERE id = $1`, [userId])).rows[0];
  return { docs, currentId: user?.current_document_id ?? null };
}

/** Insert or update one document. Scoped to the owner: a stale/foreign id can
 *  never overwrite someone else's diagram (the DO UPDATE guard is the belt, the
 *  uuid-from-the-client being practically unguessable is the suspenders). */
export async function upsertDocument(
  userId: string,
  doc: { id: string; code: string; title: string; updatedAt: number },
): Promise<void> {
  await ensureSchema();
  await pool().query(
    `INSERT INTO documents (id, user_id, title, code, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE
       SET title = EXCLUDED.title,
           code = EXCLUDED.code,
           updated_at = EXCLUDED.updated_at
       WHERE documents.user_id = EXCLUDED.user_id`,
    [doc.id, userId, doc.title, doc.code, new Date(doc.updatedAt)],
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

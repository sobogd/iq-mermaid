// Multi-document storage, backed by the account's database (via /api/documents)
// instead of localStorage. Every saved diagram is kept as
// { id, title, code, updatedAt }; `code` — the mermaid source — is the ONLY
// thing persisted per document. The canvas' own block/edge/group state is
// re-derived from it through the exact same import pipeline the source-sheet
// modal already uses, so a document never needs a second, richer format that
// could drift out of sync with what toMermaid()/parseFlowchart() actually
// round-trip.
//
// `deriveTitle` and `newDocumentId` stay client-side (pure helpers); the rest
// are async calls into the account API.

// A bare diagram-type declaration with nothing drawn yet ("flowchart TD" and
// nothing else) is what's left once every block in a document has been
// deleted — it is not a meaningful title, so it is treated the same as an
// empty document.
const BARE_TYPE_RE =
  /^(flowchart\s+\w+|graph\s+\w+|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|quadrantChart|gitGraph)$/i;

async function api(path, init = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

function sortList(list) {
  return (Array.isArray(list) ? list : []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function newDocumentId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// The title a document is recognisable by in the Open list, derived from its
// own content so nobody ever has to name a diagram just to save it: the
// first quoted label covers flowchart nodes and most other diagram types;
// the first line is the fallback for the rest (sequence, gantt, …).
export function deriveTitle(code, untitledFallback) {
  const trimmed = (code || "").trim();
  if (!trimmed) return untitledFallback;
  const quoted = trimmed.match(/"([^"]{1,60})"/);
  if (quoted) return quoted[1].trim();
  const firstLine = trimmed.split("\n")[0].trim();
  if (!firstLine || BARE_TYPE_RE.test(firstLine)) return untitledFallback;
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
}

/** Every saved document (most recently edited first) plus the id of the one
 *  that was open last, in one round trip. */
export async function loadDocuments() {
  const { docs, currentId } = await api("/api/documents");
  return { docs: sortList(docs), currentId: currentId ?? null };
}

/** Remember which document is open, persisted per account. */
export async function saveCurrentDocumentId(id) {
  await api("/api/documents", { method: "PUT", body: JSON.stringify({ id }) });
}

/** Insert or update one document's source and derived title; returns the full,
 *  re-sorted list so the caller can put it straight into state. */
export async function saveDocument(id, code, untitledFallback) {
  const title = deriveTitle(code, untitledFallback);
  // `updatedAt` is not sent: the server stamps `updated_at = now()` so the
  // "recently edited" order is authoritative and device-clock-independent.
  const { docs } = await api("/api/documents", {
    method: "POST",
    body: JSON.stringify({ id, code, title }),
  });
  return sortList(docs);
}

export async function deleteDocument(id) {
  const { docs } = await api(`/api/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
  return sortList(docs);
}

/** Set (or clear, with an empty string) the user-chosen title override. */
export async function renameDocument(id, customTitle) {
  const { docs } = await api(`/api/documents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ customTitle }),
  });
  return sortList(docs);
}

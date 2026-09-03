// Multi-document storage. Every saved diagram is kept in localStorage as
// { id, title, code, updatedAt }; `code` — the mermaid source — is the ONLY
// thing persisted per document. The canvas' own block/edge/group state is
// re-derived from it through the exact same import pipeline the source-sheet
// modal already uses, so a document never needs a second, richer format that
// could drift out of sync with what toMermaid()/parseFlowchart() actually
// round-trip.
const DOCS_KEY = "mermaid-documents";
const CURRENT_KEY = "mermaid-current-document";

// A bare diagram-type declaration with nothing drawn yet ("flowchart TD" and
// nothing else) is what's left once every block in a document has been
// deleted — it is not a meaningful title, so it is treated the same as an
// empty document.
const BARE_TYPE_RE =
  /^(flowchart\s+\w+|graph\s+\w+|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|quadrantChart|gitGraph)$/i;

function readDocs() {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((d) => d && typeof d.id === "string") : [];
  } catch {
    return [];
  }
}

function writeDocs(list) {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(list));
  } catch {
    // Private mode, or the quota is full. Losing the list is survivable; the
    // document still on screen is not affected.
  }
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

/** Every saved document, most recently edited first. */
export function loadDocuments() {
  return readDocs().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadCurrentDocumentId() {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function saveCurrentDocumentId(id) {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    /* quota or private mode */
  }
}

/** Insert or update one document's source and derived title; returns the
 *  full, re-sorted list so the caller can put it straight into state. */
export function saveDocument(id, code, untitledFallback) {
  const list = readDocs();
  const title = deriveTitle(code, untitledFallback);
  const updatedAt = Date.now();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) list.push({ id, title, code, updatedAt });
  else list[idx] = { ...list[idx], title, code, updatedAt };
  writeDocs(list);
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteDocument(id) {
  const list = readDocs().filter((d) => d.id !== id);
  writeDocs(list);
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

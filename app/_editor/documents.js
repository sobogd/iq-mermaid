// Document storage. There are two backends behind one interface, because a
// visitor may or may not have an account:
//
//  - signed in  → the account's database, via /api/documents (any number of
//                 documents, synced across devices);
//  - anonymous  → ONE document in this browser's local storage, under a single
//                 fixed key. Nothing about it reaches our server.
//
// `SERVER_STORE` / `ANON_STORE` below expose both through the same five
// methods (load / save / setCurrent / remove / rename), so the editor shell
// never branches on which one is active. The shell switches between them the
// moment a visitor signs in and hands the anonymous document over to the
// account (see EditorShell.handleAuthed).
//
// Every saved diagram is kept as { id, title, customTitle, code, updatedAt };
// `code` — the mermaid source — is the ONLY thing persisted per document. The
// canvas' own block/edge/group state is re-derived from it through the exact
// same import pipeline the source-sheet modal already uses, so a document
// never needs a second, richer format that could drift out of sync with what
// toMermaid()/parseFlowchart() actually round-trip.
//
// `deriveTitle` and `newDocumentId` stay client-side (pure helpers); the rest
// are async calls into the account API or into local storage.

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
// the first line is the fallback for the rest (sequence, gantt, …). Leading
// `%%` comments and `%%{init:…}%%` directives are skipped first — they carry
// configuration, not a title (a `%%{init:{"theme":"dark"}}%%` opening used to
// title the document "theme").
export function deriveTitle(code, untitledFallback) {
  const trimmed = (code || "").trim();
  if (!trimmed) return untitledFallback;
  const body = trimmed
    .split("\n")
    .filter((line) => !/^\s*%%/.test(line))
    .join("\n")
    .trim();
  if (!body) return untitledFallback;
  const quoted = body.match(/"([^"]{1,60})"/);
  if (quoted) return quoted[1].trim();
  const firstLine = body.split("\n")[0].trim();
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

// --- Anonymous storage: exactly one document, in this browser ---------------

// One fixed key, not a list: an anonymous visitor has a single slot, so
// "another document" is not a thing that can be stored. The JSON inside is the
// same shape a server document has, so switching storages never has to reshape
// anything — the anonymous document is handed to the account as it is.
const ANON_DOC_KEY = "iqm.anon.document";

/** Reads the anonymous document, or null when there is none. Swallows a broken
 *  JSON value (a hand-edited or truncated entry) and returns null, so a
 *  corrupted slot can never break the editor's boot. Storage access itself is
 *  guarded too: Safari's private mode throws on localStorage. */
function readAnonDocument() {
  try {
    const raw = window.localStorage.getItem(ANON_DOC_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw);
    return doc && typeof doc.id === "string" && typeof doc.code === "string" ? doc : null;
  } catch {
    return null;
  }
}

/** Overwrites the single anonymous slot. A failed write (storage disabled or
 *  full) is deliberately ignored: the editor keeps working from memory, and
 *  only persistence is lost. */
function writeAnonDocument(doc) {
  try {
    window.localStorage.setItem(ANON_DOC_KEY, JSON.stringify(doc));
  } catch {
    /* storage unavailable — the document lives on in memory only */
  }
}

/** The anonymous document as a raw doc (not a list). The sign-in handover in
 *  EditorShell needs it in that shape, to re-save it under an account. */
export function loadAnonDocument() {
  return readAnonDocument();
}

/** Drops the local copy. Called only after the account really holds the
 *  document, so a failed handover can never lose the visitor's work. */
export function clearAnonDocument() {
  try {
    window.localStorage.removeItem(ANON_DOC_KEY);
  } catch {
    /* nothing to clean up */
  }
}

/** The single-document backend. `setCurrent` is honest about doing nothing:
 *  with one slot, "which document was open last" is implied, and storing a
 *  pointer to it would just be a second source of truth. */
const ANON_STORE = {
  async load() {
    const doc = readAnonDocument();
    return { docs: doc ? [doc] : [], currentId: doc ? doc.id : null };
  },

  async save(id, code, untitledFallback) {
    const previous = readAnonDocument();
    const doc = {
      id,
      title: deriveTitle(code, untitledFallback),
      // A rename is the visitor's own choice and survives editing; it only
      // belongs to the document it was made on, so a different id starts clean.
      customTitle: previous && previous.id === id ? previous.customTitle ?? null : null,
      code,
      updatedAt: Date.now(),
    };
    writeAnonDocument(doc);
    return [doc];
  },

  async setCurrent() {
    // Single slot — see the interface note above.
  },

  async remove() {
    clearAnonDocument();
    return [];
  },

  async rename(id, customTitle) {
    const doc = readAnonDocument();
    if (!doc || doc.id !== id) return doc ? [doc] : [];
    const next = { ...doc, customTitle: customTitle || null };
    writeAnonDocument(next);
    return [next];
  },
};

/** The account backend. Same five methods, straight onto the API above. */
const SERVER_STORE = {
  load: loadDocuments,
  save: saveDocument,
  setCurrent: saveCurrentDocumentId,
  remove: deleteDocument,
  rename: renameDocument,
};

export { ANON_STORE, SERVER_STORE };

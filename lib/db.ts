// Postgres access for the editor's accounts + documents. iq-mermaid used to
// be fully static (no DB); this pool is the only place that talks to Postgres,
// and it connects lazily on the first query so `next build` never needs a
// DATABASE_URL. The schema is created idempotently on first use — there is no
// separate migration runner for this repo, so "migrate" means "CREATE TABLE IF
// NOT EXISTS" here.
import { Pool } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer NOT NULL DEFAULT 0,
  current_document_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  custom_title text,
  code text NOT NULL,
  updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The custom-title column shipped after the table existed; CREATE TABLE IF NOT
-- EXISTS won't alter an existing table, so column additions live here and stay
-- idempotent.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS custom_title text;

CREATE INDEX IF NOT EXISTS documents_user_updated
  ON documents (user_id, updated_at DESC);
`;

// The pool and the schema promise live on globalThis so Next's dev hot-reload
// (which re-imports modules) reuses one pool instead of leaking a new one per
// edit, and so the schema is ensured exactly once per process.
const globalForDb = globalThis as unknown as {
  __iqmPool?: Pool;
  __iqmSchemaReady?: Promise<void>;
};

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Prod Postgres is localhost-only on the shared VPS; anything else is a
  // remote connection that must tolerate a self-signed / managed cert.
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  return new Pool({
    connectionString: url,
    max: 5,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  });
}

export function pool(): Pool {
  if (!globalForDb.__iqmPool) globalForDb.__iqmPool = createPool();
  return globalForDb.__iqmPool;
}

/** Idempotent schema setup, run once per process. Callers just `await` it
 *  before their first query; the cached promise makes that a no-op after. */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__iqmSchemaReady) {
    globalForDb.__iqmSchemaReady = pool().query(SCHEMA).then(() => undefined);
  }
  return globalForDb.__iqmSchemaReady;
}

// In-memory fixed-window rate limiting. Single-process (pm2 runs one
// iq-mermaid fork), so a Map is enough — the same approach iq-rest's auth
// service uses. Entries are swept periodically so an attacker spraying unique
// keys can't grow the map forever.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Sweep expired entries so the map can't grow forever under abuse. Runs in the
// long-lived Next server process (not during `next build`, which never executes
// route-handler modules), so it needs no unref().
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, 10 * 60 * 1000);

/** Records an attempt for `key`. Returns true when the attempt exceeds `max`
 *  inside `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

// Client IP for rate limiting. The app sits behind nginx, which OVERWRITES
// X-Real-IP / X-Forwarded-For from the real peer (see nginx/iq-mermaid.conf),
// so these headers cannot be spoofed by the client. X-Real-IP is the simplest
// single value; the first XFF hop is the fallback.
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mermaid is a large ESM bundle pulled in only by the /app editor; keeping
  // it out of the shared chunk is what stops the marketing pages from paying
  // for it (the editor imports it through next/dynamic, ssr:false).
  //
  // pg + nodemailer power the /api auth/documents routes. They are required at
  // runtime from node_modules (the prod server runs `npm ci --omit=dev`) rather
  // than bundled: pg's optional `pg-native` require otherwise trips the bundler.
  serverExternalPackages: ["pg", "nodemailer"],
  // Next's dev server refuses cross-origin traffic (RSC requests AND the HMR
  // websocket) unless the origin is on this allowlist — loopback only by
  // default. Opening the dev server from a phone (LAN IP or Tailscale IP)
  // otherwise leaves the page fully rendered but completely inert: chunks
  // load, but hydration never finishes, so nothing is clickable. This machine
  // is reachable at these addresses; adjust if they change.
  allowedDevOrigins: ["100.101.19.85", "192.168.1.169"],
};

export default nextConfig;

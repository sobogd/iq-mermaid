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
};

export default nextConfig;

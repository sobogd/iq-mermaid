import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mermaid is a large ESM bundle pulled in only by the /app editor; keeping
  // it out of the shared chunk is what stops the marketing pages from paying
  // for it (the editor imports it through next/dynamic, ssr:false).
  serverExternalPackages: [],
};

export default nextConfig;

import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND,
    short_name: "Mermaid",
    description: "Free online mermaid editor — visual canvas and mermaid code, side by side",
    // Installed copies open the editor, not the marketing page. proxy.ts sends
    // /app on to the visitor's own locale (/es/app, /de/app, …).
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#d9534f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

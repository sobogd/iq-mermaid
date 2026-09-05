import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND,
    short_name: "Mermaid",
    description: "Free online mermaid editor — visual canvas and mermaid code, side by side",
    // The editor has no dedicated route — it is the shared background under
    // the window on every page (the old /app URL only 302s back to the locale
    // home), so an installed copy simply opens the home page.
    start_url: "/",
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

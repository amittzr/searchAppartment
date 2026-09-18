// ============================================================
// Web App Manifest — Next.js 15 App Router convention
// Automatically served at /manifest.webmanifest
//
// IMPORTANT: Before deploying, place these image files in /public/icons/:
//   - icon-192x192.png   (192×192 px, PNG)
//   - icon-512x512.png   (512×512 px, PNG)
//   - apple-touch-icon.png  (180×180 px, PNG — used by iOS Safari)
//
// Recommended tools for generating these from your logo:
//   - https://favicon.io
//   - https://www.pwabuilder.com/imageGenerator
// ============================================================

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "GroupPick",
    short_name:       "GroupPick",
    description:      "Collaborative tracker for apartments, vehicles, venues and more.",
    start_url:        "/",
    display:          "standalone",      // hides browser chrome — feels like a native app
    orientation:      "portrait",
    background_color: "#ffffff",
    theme_color:      "#8b5cf6",         // matches brand-600 purple used throughout the app
    categories:       ["lifestyle", "utilities"],
    icons: [
      {
        src:     "/icons/icon-192x192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-512x512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "any",
      },
      {
        // Maskable icon: safe zone ensures the icon looks correct on
        // Android adaptive icon shapes (circles, squircles, etc.)
        src:     "/icons/icon-512x512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
    ],
  };
}

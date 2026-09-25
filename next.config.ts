import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip ESLint during `next build` — TypeScript strict mode catches real errors.
  // ESLint can still be run separately with `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Explicit allowlist of trusted image sources.
    // Wildcard "**" removed — it turned the server into an open image proxy.
    remotePatterns: [
      // Yad2 CDN (listing photos from scraper)
      { protocol: "https", hostname: "**.yad2.co.il" },
      { protocol: "https", hostname: "**.yad-il.co.il" },
      // Facebook / Instagram CDN
      { protocol: "https", hostname: "**.facebook.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      // Supabase Storage (uploaded photos)
      { protocol: "https", hostname: "*.supabase.co" },
      // Common image hosting services users may paste manually
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "**.imgur.com" },
      { protocol: "https", hostname: "i.imgur.com" },
    ],
  },
};

export default nextConfig;

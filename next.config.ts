import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from common apartment listing sources.
    // Keeping https-only; http is excluded to prevent mixed-content issues.
    remotePatterns: [
      { protocol: "https", hostname: "**.yad2.co.il" },
      { protocol: "https", hostname: "**.facebook.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      // Generic fallback for other https image hosts users may paste
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;

import type { Metadata, Viewport } from "next";
import "./globals.css";

// ── Viewport ──────────────────────────────────────────────────────────────────
// Exported separately per Next.js 15 convention.
// maximumScale: 1 prevents unwanted auto-zoom on iOS when focusing inputs.

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,       // prevents iOS auto-zoom on form inputs
  themeColor:   "#8b5cf6", // purple — matches manifest.ts and app brand
};

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  // App identity
  title:       "JustPick",
  description: "Collaborative tracker for apartments, vehicles, venues and more.",

  // Prevent search engines from indexing this private app
  robots: { index: false, follow: false },

  // PWA manifest link (Next.js picks this up automatically from manifest.ts)
  manifest: "/manifest.webmanifest",

  // ── iOS / Apple Web App ────────────────────────────────────────────────────
  // Enables "Add to Home Screen" full-screen standalone mode on iOS Safari.
  appleWebApp: {
    capable:         true,
    title:           "JustPick",
    statusBarStyle:  "default",
    // Apple Touch Icon — iOS uses this when adding to Home Screen.
    // Place a 180×180 px PNG at public/icons/apple-touch-icon.png
    startupImage:    [],
  },

  // ── Standard PWA icons ─────────────────────────────────────────────────────
  icons: {
    // Favicon (browser tab)
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    // Apple touch icon shown when saving to iOS Home Screen
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    // Shortcut icon for classic browser compatibility
    shortcut: "/icons/icon-192x192.png",
  },
};

// ── Root Layout ───────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="ltr" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Preconnect to Google Fonts for faster Inter font load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Register service worker — required for Android PWA install prompt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
                    .catch(function(err) { console.warn('[SW] Registration failed:', err); });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

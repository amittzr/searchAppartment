// ============================================================
// GroupPick Service Worker
// Minimal service worker required by Chrome to enable PWA
// install prompt (beforeinstallprompt event).
//
// Strategy: network-first for all requests.
// This keeps the app always fresh while satisfying the PWA
// installability criteria.
// ============================================================

const CACHE_NAME = "grouppick-v1";

// Install: activate immediately without waiting
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch: network-first, silent fallback to cache for offline support
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a copy of successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request);
      })
  );
});

// ============================================================
// GroupPick Service Worker v4
//
// Responsibilities:
//   1. Network-first caching with automatic old-cache cleanup
//   2. Handle incoming Web Push events and show notifications
//   3. Handle notification click — open or focus the app
//
// IMPORTANT: Bump CACHE_VERSION on every production deploy so
// users always receive the latest build automatically.
// ============================================================

const CACHE_VERSION = "v4"; // ← increment on every deploy
const CACHE_NAME    = `grouppick-${CACHE_VERSION}`;

// ── Lifecycle: Install ────────────────────────────────────────────────────────
// Skip waiting so the new SW activates as soon as it installs
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Lifecycle: Activate ───────────────────────────────────────────────────────
// Delete all OLD caches, then claim all open clients immediately.
// This forces every open tab to use the new service worker.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first with cache fallback ──────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push: Receive and display notification ────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // If payload is not JSON, use plain text as body
    payload = { title: "GroupPick", body: event.data.text(), url: "/", tag: "grouppick" };
  }

  const title   = payload.title ?? "GroupPick";
  const options = {
    body:    payload.body  ?? "",
    icon:    payload.icon  ?? "/icons/icon-192x192.png",
    badge:   "/icons/icon-192x192.png",
    tag:     payload.tag   ?? "grouppick",  // same-tag replaces older notification
    data:    { url: payload.url ?? "/" },
    // Show notification even when the app is in the foreground
    requireInteraction: false,
    // Vibration pattern for mobile: vibrate, pause, vibrate
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── NotificationClick: Open or focus the app ──────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        // App is not open — open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

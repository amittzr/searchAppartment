"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================================
// usePushNotifications
// Manages the full lifecycle of Web Push subscription:
//   1. Check current permission state
//   2. Request permission + subscribe service worker
//   3. Save/remove subscription via /api/push/subscribe
//   4. Persist "enabled" state in localStorage for UX continuity
// ============================================================

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface UsePushNotificationsReturn {
  /** True when the device supports Web Push */
  isSupported:  boolean;
  /** Current browser permission state */
  permission:   PushPermission;
  /** True when the user has an active push subscription */
  isSubscribed: boolean;
  /** True while subscribing/unsubscribing */
  isLoading:    boolean;
  /** Last error message, if any */
  error:        string | null;
  /** Subscribe to push notifications */
  subscribe:    () => Promise<void>;
  /** Unsubscribe from push notifications */
  unsubscribe:  () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts a base64 URL-safe string to a Uint8Array (required for VAPID key) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Returns the VAPID public key from the server */
async function fetchVapidKey(): Promise<string> {
  const res  = await fetch("/api/push/vapid-key");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch VAPID key");
  return data.publicKey as string;
}

/** Saves or removes the subscription on the server */
async function syncSubscriptionWithServer(
  action:       "subscribe" | "unsubscribe",
  subscription: PushSubscription
): Promise<void> {
  const res = await fetch("/api/push/subscribe", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ action, subscription: subscription.toJSON() }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Server responded with ${res.status}`);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported,  setIsSupported]  = useState(false);
  const [permission,   setPermission]   = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Initialize: check current state on mount ─────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      "serviceWorker" in navigator &&
      "PushManager"   in window &&
      "Notification"  in window;

    setIsSupported(supported);

    if (!supported) {
      setPermission("unsupported");
      return;
    }

    // Reflect current permission
    setPermission(Notification.permission as PushPermission);

    // Check if there is an active subscription
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch(() => {
        // Service worker not ready yet — that's fine
      });
  }, []);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Push notifications are not supported on this device.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);

      if (perm !== "granted") {
        setError(
          perm === "denied"
            ? "Notifications were blocked. Please enable them in your browser settings."
            : "Notification permission was dismissed."
        );
        return;
      }

      // 2. Get VAPID public key
      const vapidKey = await fetchVapidKey();

      // 3. Wait for the service worker to be ready
      const reg = await navigator.serviceWorker.ready;

      // 4. Subscribe the push manager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      // 5. Save subscription on the server
      await syncSubscriptionWithServer("subscribe", sub);

      setIsSubscribed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to enable notifications";
      setError(msg);
      console.error("[usePushNotifications] Subscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // Remove from server first
        await syncSubscriptionWithServer("unsubscribe", sub);
        // Then unsubscribe in the browser
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to disable notifications";
      setError(msg);
      console.error("[usePushNotifications] Unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

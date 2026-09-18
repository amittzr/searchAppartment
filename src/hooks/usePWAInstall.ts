"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================================
// usePWAInstall — detects PWA installability and triggers install
//
// Handles four distinct scenarios:
//   1. Already installed (standalone mode) — show "installed" badge
//   2. Android/Chrome — native BeforeInstallPromptEvent available — show button
//   3. Android/Chrome — prompt not yet fired (waiting or criteria not met) — show manual instructions
//   4. iOS Safari — no install API — show Share → Add to Home Screen instructions
// ============================================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export interface UsePWAInstallReturn {
  /** True when the browser has a deferred install prompt ready (Android/Chrome) */
  isInstallable:  boolean;
  /** True when the user is on iOS and the app is NOT yet installed */
  isIOS:          boolean;
  /** True when the user is on Android and the app is NOT yet installed */
  isAndroid:      boolean;
  /** True when the app is already running in standalone (installed) mode */
  isInstalled:    boolean;
  /** Triggers the native install prompt. No-op if not installable. */
  promptInstall:  () => Promise<void>;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable]   = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [isAndroid, setIsAndroid]           = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── Detect standalone (already installed) ──────────────────────────────
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const isStandalone =
      standaloneMedia.matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // ── Detect platform ────────────────────────────────────────────────────
    const ua = navigator.userAgent;
    const isIOSDevice     = /iPhone|iPad|iPod/i.test(ua);
    const isAndroidDevice = /Android/i.test(ua);

    if (isIOSDevice) {
      setIsIOS(true);
      return; // iOS has no beforeinstallprompt
    }

    if (isAndroidDevice) {
      // Mark as Android so we can show manual instructions as fallback
      // even if beforeinstallprompt hasn't fired yet
      setIsAndroid(true);
    }

    // ── Listen for Chrome / Android install prompt ─────────────────────────
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // prevent default mini-infobar
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[usePWAInstall] User ${outcome} the install prompt`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, [deferredPrompt]);

  return { isInstallable, isIOS, isAndroid, isInstalled, promptInstall };
}

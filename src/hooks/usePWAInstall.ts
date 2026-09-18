"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================================
// usePWAInstall — detects PWA installability and triggers install
//
// Handles three distinct scenarios:
//   1. Android / Chrome / Edge: native BeforeInstallPromptEvent
//   2. iOS Safari: no install API — show manual instructions
//   3. Already installed: running in standalone mode
// ============================================================

// BeforeInstallPromptEvent is not in the standard TypeScript DOM types yet
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export interface UsePWAInstallReturn {
  /** True when the browser has a deferred install prompt ready (Android/Chrome) */
  isInstallable: boolean;
  /** True when the user is on an iOS device and the app is NOT yet installed */
  isIOS: boolean;
  /** True when the app is already running in standalone (installed) mode */
  isInstalled: boolean;
  /** Triggers the native install prompt. No-op if not installable. */
  promptInstall: () => Promise<void>;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable]   = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);

  useEffect(() => {
    // Guard: skip on server-side render
    if (typeof window === "undefined") return;

    // ── Detect standalone (already installed) ──────────────────────────────
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    // navigator.standalone is an Apple-specific property
    const isStandalone =
      standaloneMedia.matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);

    if (isStandalone) {
      setIsInstalled(true);
      return; // No need to listen for install events
    }

    // ── Detect iOS ─────────────────────────────────────────────────────────
    const ua = navigator.userAgent;
    const isIOSDevice = /iPhone|iPad|iPod/i.test(ua);
    // On iOS, the app is installable only when NOT already in standalone mode
    if (isIOSDevice) {
      setIsIOS(true);
      return; // iOS has no beforeinstallprompt — instructions are shown instead
    }

    // ── Listen for Chrome / Android install prompt ─────────────────────────
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // ── Listen for successful installation ─────────────────────────────────
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // ── Trigger the deferred install prompt ───────────────────────────────────
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[usePWAInstall] User ${outcome} the install prompt`);

    // Clear the prompt — it can only be used once
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, [deferredPrompt]);

  return { isInstallable, isIOS, isInstalled, promptInstall };
}

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
//
// It also exposes a best-effort description of the device/browser
// (platform, browser, iPad, in-app browser, canInstall) so the UI can show
// only the install steps that are relevant to the user's OS.
// ============================================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";
export type InstallBrowser  = "safari" | "chrome" | "edge" | "samsung" | "firefox" | "other";

/** Best-effort, user-agent based description of where the app is running. */
export interface InstallEnvironment {
  /** Operating system family. "unknown" until detection has run on the client. */
  platform:        InstallPlatform;
  browser:         InstallBrowser;
  /** True for iPads (including iPadOS, which reports itself as a Mac). */
  isIPad:          boolean;
  /** True inside another app's built-in browser (WhatsApp, Instagram, ...), which cannot install web apps. */
  isInAppBrowser:  boolean;
  /**
   * True when this browser/OS combination supports adding the app to the
   * home screen / dock at all, ignoring whether the native prompt has fired.
   */
  canInstall:      boolean;
}

export interface UsePWAInstallReturn extends InstallEnvironment {
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

const UNKNOWN_ENVIRONMENT: InstallEnvironment = {
  platform:       "unknown",
  browser:        "other",
  isIPad:         false,
  isInAppBrowser: false,
  canInstall:     false,
};

// Tokens found in the user agent of popular in-app browsers
const IN_APP_BROWSER_PATTERN =
  /FBAN|FBAV|FB_IAB|Instagram|Snapchat|Line\/|MicroMessenger|TikTok|BytedanceWebview|LinkedInApp|Twitter/i;

/** Detects platform and browser from the user agent. Safe to call only in the browser. */
export function detectInstallEnvironment(): InstallEnvironment {
  const ua = navigator.userAgent;

  // iPadOS 13+ reports a Macintosh user agent, so it is told apart by touch support
  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isIOS  = /iPhone|iPod/i.test(ua) || isIPad;
  const isAndroid = /Android/i.test(ua);

  const platform: InstallPlatform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

  // ── Browser ────────────────────────────────────────────────────────────
  let browser: InstallBrowser = "other";
  if (platform === "ios") {
    if (/CriOS/i.test(ua))       browser = "chrome";
    else if (/FxiOS/i.test(ua))  browser = "firefox";
    else if (/EdgiOS/i.test(ua)) browser = "edge";
    else if (/Safari/i.test(ua)) browser = "safari";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "samsung";
  } else if (/Edg(e|A)?\//i.test(ua)) {
    browser = "edge";
  } else if (/Firefox/i.test(ua)) {
    browser = "firefox";
  } else if (/OPR\//i.test(ua)) {
    browser = "other"; // Opera
  } else if (/Chrome|Chromium/i.test(ua)) {
    browser = "chrome";
  } else if (/Safari/i.test(ua)) {
    browser = "safari";
  }

  // ── In-app browsers ────────────────────────────────────────────────────
  // iOS web views omit the "Safari" token entirely; Android web views add "; wv)".
  const isIOSWebView = platform === "ios" &&
    !/Safari|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const isAndroidWebView = platform === "android" && /; wv\)/i.test(ua);
  const isInAppBrowser =
    IN_APP_BROWSER_PATTERN.test(ua) || isIOSWebView || isAndroidWebView;

  // ── Can this browser install the app at all? ───────────────────────────
  let canInstall = false;
  if (!isInAppBrowser) {
    if (platform === "ios" || platform === "android") {
      canInstall = true;
    } else if (browser === "chrome" || browser === "edge") {
      canInstall = true;
    } else if (browser === "safari") {
      // "Add to Dock" arrived with Safari 17 (macOS Sonoma)
      const version = Number(ua.match(/Version\/(\d+)/)?.[1] ?? 0);
      canInstall = version >= 17;
    }
    // Firefox desktop and unknown browsers cannot install web apps
  }

  return { platform, browser, isIPad, isInAppBrowser, canInstall };
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable]   = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [isAndroid, setIsAndroid]           = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);
  const [environment, setEnvironment]       = useState<InstallEnvironment>(UNKNOWN_ENVIRONMENT);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── Describe the device/browser (used to pick the right instructions) ──
    const env = detectInstallEnvironment();
    setEnvironment(env);

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
    if (env.platform === "ios") {
      setIsIOS(true);
      return; // iOS has no beforeinstallprompt
    }

    if (env.platform === "android") {
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

  return { ...environment, isInstallable, isIOS, isAndroid, isInstalled, promptInstall };
}

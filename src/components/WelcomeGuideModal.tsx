"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  Monitor,
  Share,
  MoreVertical,
  Menu,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Maximize2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePWAInstall } from "@/hooks/usePWAInstall";

// ============================================================
// WelcomeGuideModal
// One-time, two-step guide shown to a user right after their first signup.
// The SAME two steps are shown on every platform, in this order:
//
//   Step 1 — Add JustPick to the Home Screen (install the app)
//   Step 2 — Enable push notifications
//
// Install instructions in Step 1 adapt to the device (native prompt when
// available, otherwise per-OS steps), but the step sequence itself never
// changes. The parent decides WHEN to show the guide
// (profile.has_completed_onboarding) and persists completion; completing or
// dismissing it here just calls onComplete.
// ============================================================

type PushState = ReturnType<typeof usePushNotifications>;
type PwaState  = ReturnType<typeof usePWAInstall>;

interface WelcomeGuideModalProps {
  isOpen:     boolean;
  /** Called once when the guide is finished or dismissed in any way. */
  onComplete: () => void;
}

const TOTAL_STEPS = 2;

export default function WelcomeGuideModal({ isOpen, onComplete }: WelcomeGuideModalProps) {
  // Hooks stay mounted even while the guide is closed so the browser's
  // `beforeinstallprompt` event is captured before the guide opens.
  const push = usePushNotifications();
  const pwa  = usePWAInstall();

  const [step, setStep] = useState(0); // 0 = install, 1 = notifications

  // Escape dismisses the guide. Backdrop clicks are intentionally ignored so
  // the one-time guide is not dismissed by an accidental tap.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-guide-title"
    >
      {/* Backdrop (decorative — does not dismiss the guide) */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up max-h-[92dvh] flex flex-col">

        {/* ── Header: progress + skip ─────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-violet-600 dark:bg-violet-400"
                    : i < step
                    ? "w-4 bg-violet-300 dark:bg-violet-700"
                    : "w-4 bg-slate-200 dark:bg-slate-600"
                }`}
              />
            ))}
            <span className="ml-1 text-xs font-medium text-slate-400 dark:text-slate-500">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>
          <button
            type="button"
            onClick={onComplete}
            aria-label="Skip the welcome guide"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-700"
          >
            Skip
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body (scrollable) ───────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
          {step === 0 ? (
            <InstallStep pwa={pwa} />
          ) : (
            <NotificationsStep push={push} isIOS={pwa.platform === "ios"} />
          )}
        </div>

        {/* ── Footer: navigation ──────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLastStep ? onComplete() : setStep((s) => s + 1))}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white text-sm font-semibold shadow-md hover:from-violet-600 hover:to-blue-700 active:scale-95 transition-all"
          >
            {isLastStep ? "Get Started" : "Next"}
            {!isLastStep && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared step header ────────────────────────────────────────────────────────

/**
 * Icon + heading + description. The first step also carries the
 * "Welcome to JustPick" greeting as the dialog's main heading.
 */
function StepHero({
  icon,
  iconClass,
  title,
  description,
  showWelcome,
}: {
  icon:        React.ReactNode;
  iconClass:   string;
  title:       string;
  description: string;
  showWelcome: boolean;
}) {
  return (
    <>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${iconClass}`}>
        {icon}
      </div>

      <div>
        {showWelcome ? (
          <>
            <h2 id="welcome-guide-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Welcome to JustPick 🎉
            </h2>
            <h3 className="mt-1 text-base font-semibold text-slate-700 dark:text-slate-200">
              {title}
            </h3>
          </>
        ) : (
          <h2 id="welcome-guide-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
        )}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          {description}
        </p>
      </div>
    </>
  );
}

// ── Step 1: Add to Home Screen ────────────────────────────────────────────────

function InstallStep({ pwa }: { pwa: PwaState }) {
  const isMobile = pwa.platform === "ios" || pwa.platform === "android";

  return (
    <div className="flex flex-col items-center text-center gap-4 pt-2">
      <StepHero
        icon={
          isMobile ? (
            <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-300" />
          ) : (
            <Monitor className="w-8 h-8 text-blue-600 dark:text-blue-300" />
          )
        }
        iconClass="bg-blue-100 dark:bg-blue-900/40"
        title={isMobile ? "Add JustPick to your Home Screen" : "Install JustPick as an app"}
        description="Get the full app experience — and unlock notifications so you never miss a thing."
        showWelcome
      />

      <BenefitList isMobile={isMobile} />

      <div className="w-full text-left">
        <InstallAction pwa={pwa} />
      </div>
    </div>
  );
}

// ── Benefit rows (marketing) ──────────────────────────────────────────────────

function BenefitList({ isMobile }: { isMobile: boolean }) {
  const benefits: { icon: LucideIcon; text: string }[] = [
    {
      icon: BellRing,
      text: "Instant alerts the moment your partner likes, comments or adds something",
    },
    {
      icon: Zap,
      text: isMobile ? "One tap to open — straight from your Home Screen" : "Launch it like any other app on your computer",
    },
    {
      icon: Maximize2,
      text: isMobile ? "Full screen, no browser bars in the way" : "Its own window, no browser tabs",
    },
  ];

  return (
    <ul className="w-full flex flex-col gap-2 text-left">
      {benefits.map(({ icon: Icon, text }) => (
        <li
          key={text}
          className="flex items-start gap-3 p-3 rounded-xl bg-violet-50/70 dark:bg-violet-900/20"
        >
          <span className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Icon className="w-4 h-4 text-violet-600 dark:text-violet-300" />
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200 leading-snug pt-1.5">
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Install action: native button first, otherwise the OS-specific steps ──────

function InstallAction({ pwa }: { pwa: PwaState }) {
  const isMobile = pwa.platform === "ios" || pwa.platform === "android";

  // Already installed → confirmation only
  if (pwa.isInstalled) {
    return (
      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
        <CheckCircle2 className="w-4 h-4" />
        JustPick is installed ✅ Open it anytime from your {isMobile ? "Home Screen" : "apps"}.
      </div>
    );
  }

  // Best path: the browser offers a native one-tap install
  if (pwa.isInstallable) {
    return (
      <div>
        <button
          type="button"
          onClick={pwa.promptInstall}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          {isMobile ? "Add to Home Screen" : "Install JustPick"}
        </button>

        {/* Manual steps stay available but tucked away */}
        <details className="mt-3">
          <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Prefer to do it manually?
          </summary>
          <div className="mt-3">
            <ManualInstallSteps pwa={pwa} />
          </div>
        </details>
      </div>
    );
  }

  // No native button available → show only this device's steps
  return <ManualInstallSteps pwa={pwa} />;
}

// ── Manual steps, one variant per OS / browser ────────────────────────────────

function ManualInstallSteps({ pwa }: { pwa: PwaState }) {
  // iPhone / iPad (Safari and other iOS browsers all use the Share sheet)
  if (pwa.platform === "ios") {
    const shareLocation =
      pwa.browser !== "safari"
        ? "in the browser's toolbar"
        : pwa.isIPad
        ? "at the top of the screen"
        : "at the bottom of the screen";

    return (
      <InstructionList
        title={pwa.isIPad ? "On your iPad (Safari)" : "On your iPhone (Safari)"}
        steps={[
          <>
            Tap the <Share className="inline-block w-4 h-4 -mt-0.5 mx-0.5" />
            <strong> Share</strong> button {shareLocation}
          </>,
          <>
            Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
          </>,
          <>
            Tap <strong>Add</strong> in the top corner
          </>,
          <>Open JustPick from your Home Screen</>,
        ]}
      />
    );
  }

  // Android
  if (pwa.platform === "android") {
    if (pwa.browser === "samsung") {
      return (
        <InstructionList
          title="On Android (Samsung Internet)"
          steps={[
            <>
              Tap the <Menu className="inline-block w-4 h-4 -mt-0.5 mx-0.5" />
              <strong> menu</strong> button
            </>,
            <>
              Tap <strong>&quot;Add page to&quot;</strong>, then <strong>&quot;Home screen&quot;</strong>
            </>,
            <>
              Tap <strong>Add</strong> to confirm
            </>,
          ]}
        />
      );
    }

    return (
      <InstructionList
        title="On Android (Chrome)"
        steps={[
          <>
            Tap the <MoreVertical className="inline-block w-4 h-4 -mt-0.5 mx-0.5" />
            <strong> menu</strong> (3 dots) in Chrome
          </>,
          <>
            Tap <strong>&quot;Install app&quot;</strong> or{" "}
            <strong>&quot;Add to Home screen&quot;</strong>
          </>,
          <>
            Confirm with <strong>Install</strong> / <strong>Add</strong>
          </>,
        ]}
      />
    );
  }

  // Desktop Safari (macOS)
  if (pwa.platform === "desktop" && pwa.browser === "safari") {
    return (
      <InstructionList
        title="On your Mac (Safari)"
        steps={[
          <>
            Click the <Share className="inline-block w-4 h-4 -mt-0.5 mx-0.5" />
            <strong> Share</strong> button in the toolbar
          </>,
          <>
            Choose <strong>&quot;Add to Dock&quot;</strong>
          </>,
          <>
            Click <strong>Add</strong>
          </>,
        ]}
      />
    );
  }

  // Desktop (Chrome / Edge / other) and generic fallback
  return (
    <InstructionList
      title="On your computer"
      steps={[
        <>
          Click the <Download className="inline-block w-4 h-4 -mt-0.5 mx-0.5" />
          <strong> install icon</strong> at the right end of the address bar
        </>,
        <>
          No icon? Open the browser menu and choose <strong>&quot;Install JustPick&quot;</strong>{" "}
          (Chrome) or <strong>Apps → &quot;Install this site as an app&quot;</strong> (Edge)
        </>,
        <>
          Confirm with <strong>Install</strong>
        </>,
      ]}
    />
  );
}

// ── Step 2: Enable notifications ──────────────────────────────────────────────

function NotificationsStep({
  push,
  isIOS,
}: {
  push:  PushState;
  isIOS: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-2">
      <StepHero
        icon={<Bell className="w-8 h-8 text-violet-600 dark:text-violet-300" />}
        iconClass="bg-violet-100 dark:bg-violet-900/40"
        title="Never miss a moment"
        description="Turn on notifications and know the second your partner likes, comments or finds a match."
        showWelcome={false}
      />

      <div className="w-full">
        {push.isSubscribed ? (
          // Already enabled
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
            <BellRing className="w-4 h-4" />
            Notifications are on 🔔
          </div>
        ) : push.permission === "denied" ? (
          // Blocked in browser settings
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm text-left dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300">
            <BellOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Notifications are blocked. You can allow them in your browser settings and
              turn them on later from Settings.
            </span>
          </div>
        ) : push.permission === "unsupported" ? (
          // Device/browser cannot do web push (e.g. iOS older than 16.4)
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm text-left dark:bg-slate-700/40 dark:border-slate-700 dark:text-slate-300">
            Notifications aren&apos;t supported on this device or browser. You can still use
            JustPick normally.
          </div>
        ) : (
          // Ready to ask — the click is the user gesture the browser requires
          <button
            type="button"
            onClick={push.subscribe}
            disabled={push.isLoading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {push.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            {push.isLoading ? "Enabling…" : "Enable Notifications"}
          </button>
        )}

        {push.error && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400">{push.error}</p>
        )}

        {/* iOS-specific explanation: push only works from the installed Home Screen app */}
        {isIOS && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs text-left dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200">
            <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>On iPhone &amp; iPad:</strong> notifications only work after you add JustPick
              to your Home Screen (Step 1). Open the app from its Home Screen icon, then come back
              to Settings and tap <strong>&quot;Enable Notifications&quot;</strong> to turn them on.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Numbered instruction list ─────────────────────────────────────────────────

function InstructionList({ title, steps }: { title: string; steps: React.ReactNode[] }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-700/40 dark:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
        {title}
      </p>
      <ol className="flex flex-col gap-3">
        {steps.map((content, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </span>
            <span className="leading-snug pt-0.5">{content}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

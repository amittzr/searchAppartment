"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import JustPickLogo from "@/components/JustPickLogo";
import type { AuthGateReason } from "@/contexts/AuthGateContext";

// ============================================================
// AuthGateModal
//
// Conversion modal shown in the /demo playground when a visitor
// tries a high-intent action. Email + password only for now;
// both links carry source=demo so signup can skip the invite gate.
// ============================================================

interface AuthGateModalProps {
  /** null = closed */
  reason: AuthGateReason | null;
  onClose: () => void;
}

const HEADLINES: Record<AuthGateReason, string> = {
  add: "Save this apartment",
  like: "Save your reaction",
  match: "Make it a match",
  comment: "Join the conversation",
  invite: "Invite your partner",
  edit: "Make it yours",
  delete: "Manage your list",
};

const BODY_COPY =
  "Loved the experience? Start hunting together! Create your free account in 10 seconds to save your properties and invite your partner.";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AuthGateModal({ reason, onClose }: AuthGateModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const isOpen = reason !== null;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Keep keyboard focus inside the dialog while it is open
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!reason) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
      aria-describedby="auth-gate-body"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-modal p-6 animate-slide-up"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-700"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <JustPickLogo size="lg" />

          <div>
            <p className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold dark:bg-violet-900/40 dark:text-violet-300">
              <Sparkles className="w-3 h-3" />
              Free account
            </p>
            <h2 id="auth-gate-title" className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              {HEADLINES[reason]}
            </h2>
            <p id="auth-gate-body" className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {BODY_COPY}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <Link
              ref={primaryRef}
              href="/signup?source=demo"
              className="flex items-center justify-center w-full py-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-violet-600 hover:to-blue-700 active:scale-95 transition-all duration-150"
            >
              Create free account
            </Link>
            <Link
              href="/login?source=demo"
              className="flex items-center justify-center w-full py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              I already have an account
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
            >
              Keep exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

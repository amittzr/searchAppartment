"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import TermsContent, { TERMS_LAST_UPDATED } from "@/components/legal/TermsContent";
import PrivacyContent, { PRIVACY_LAST_UPDATED } from "@/components/legal/PrivacyContent";

// ============================================================
// LegalModal
// Pop-up that shows the Terms of Service or Privacy Policy without leaving
// the current page (used on /signup so the form state is never lost).
//
// - type === null  → modal is closed
// - "I Agree"      → calls onAgree (the parent checks the consent checkbox)
// - "Close" / X / Escape / backdrop click → calls onClose only
// ============================================================

export type LegalDocType = "terms" | "privacy";

interface LegalModalProps {
  /** Which document to show; null keeps the modal closed. */
  type:    LegalDocType | null;
  onClose: () => void;
  onAgree: () => void;
}

export default function LegalModal({ type, onClose, onAgree }: LegalModalProps) {
  const isOpen = type !== null;

  // Escape key closes the pop-up
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll while the pop-up is open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!type) return null;

  const isTerms     = type === "terms";
  const title       = isTerms ? "Terms of Service" : "Privacy Policy";
  const lastUpdated = isTerms ? TERMS_LAST_UPDATED : PRIVACY_LAST_UPDATED;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centered card on desktop */}
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up h-[90dvh] sm:h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 id="legal-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Last updated: {lastUpdated}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:hover:text-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable document body (flex-1 + min-h-0 enables overflow scrolling) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 text-sm">
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white text-sm font-semibold shadow-md hover:from-violet-600 hover:to-blue-700 active:scale-95 transition-all"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TermsContent, { TERMS_LAST_UPDATED } from "@/components/legal/TermsContent";

// ============================================================
// Terms of Service Page
// The document text lives in <TermsContent /> so the signup pop-up
// shows exactly the same wording.
// ============================================================

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Sticky back bar */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to JustPick
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Terms of Service</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">Last updated: {TERMS_LAST_UPDATED}</p>

        <TermsContent />
      </main>
    </div>
  );
}

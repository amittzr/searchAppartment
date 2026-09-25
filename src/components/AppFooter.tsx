"use client";

import Link from "next/link";

// ============================================================
// AppFooter — Minimal legal footer shown on authenticated pages
// Links to Terms of Service and Privacy Policy.
// Kept intentionally unobtrusive.
// ============================================================

export default function AppFooter() {
  return (
    <footer className="w-full border-t border-slate-100 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        <span className="text-xs text-slate-400">
          © {new Date().getFullYear()} JustPick
        </span>
        <Link
          href="/legal/privacy"
          className="text-xs text-slate-400 hover:text-violet-600 transition-colors"
        >
          Privacy Policy
        </Link>
        <Link
          href="/legal/terms"
          className="text-xs text-slate-400 hover:text-violet-600 transition-colors"
        >
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}

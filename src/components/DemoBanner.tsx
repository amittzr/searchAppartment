"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

// ============================================================
// DemoBanner
// Slim strip shown above the navbar in the /demo playground.
// Explains the sandbox and keeps both auth options one click away.
// ============================================================

export default function DemoBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 text-xs sm:text-sm font-medium">
          <Sparkles className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>You are exploring a demo with sample apartments. Nothing is saved.</span>
        </p>
        <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
          <Link
            href="/login?source=demo"
            className="underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
          >
            Sign in
          </Link>
          <Link
            href="/signup?source=demo"
            className="px-3 py-1 rounded-lg bg-white text-violet-700 hover:bg-violet-50 transition-colors"
          >
            Create free account
          </Link>
        </div>
      </div>
    </div>
  );
}

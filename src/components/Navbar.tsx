"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Plus, RefreshCw, LogOut } from "lucide-react";

interface NavbarProps {
  onAddClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Navbar({ onAddClick, onRefresh, isRefreshing }: NavbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Always redirect to login, even if the request fails
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand / Logo ─────────────────────────────────────── */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md">
              <Home className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                ApartmentTracker
              </h1>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Find your home together 🏡
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Refresh button — manual sync trigger */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh apartments"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Log out"
              title="Log out"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Add Apartment CTA */}
            <button
              onClick={onAddClick}
              aria-label="Add new apartment"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Add Apartment</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

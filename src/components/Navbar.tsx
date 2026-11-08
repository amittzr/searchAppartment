"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { 
  Plus, RefreshCw, LogOut, Copy, Check, 
  ChevronDown, User, Settings, Sun, Moon
} from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import Link from "next/link";

interface NavbarProps {
  onAddClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Public /demo playground: swaps the account menu for sign-in / sign-up actions. */
  demoMode?: boolean;
}

export default function Navbar({ onAddClick, onRefresh, isRefreshing, demoMode = false }: NavbarProps) {
  const { requireAuth } = useAuthGate();
  const { 
    household, 
    profile, 
    members,
    categoryConfig, 
    signOut, 
    copyInviteCode 
  } = useHousehold();

  const { theme, toggleTheme } = useTheme();

  const [loggingOut, setLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      // signOut handles redirect
    }
  };

  const handleCopyInviteCode = async () => {
    const success = await copyInviteCode();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand / Logo + Household ────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Logo mark — official JustPick icon from /public/icons/ */}
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md flex-shrink-0">
              <Image
                src="/icons/icon-192x192.png"
                alt="JustPick"
                width={36}
                height={36}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            
            {/* Brand + Household info */}
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  JustPick
                </h1>
                {household && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 text-xs font-medium hidden sm:inline-flex items-center gap-1">
                    <span>{categoryConfig.emoji}</span>
                    <span>{categoryConfig.label}</span>
                  </span>
                )}
              </div>
              {household && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  {household.name}
                  {members.length > 0 && (
                    <span className="text-slate-400 dark:text-slate-500"> · {members.length} {members.length === 1 ? "member" : "members"}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Demo: invite is a gated, high-intent action */}
            {demoMode && (
              <button
                onClick={() => requireAuth("invite")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 hover:border-slate-300 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Invite partner</span>
              </button>
            )}

            {/* Invite code copy button */}
            {!demoMode && household?.invite_code && (
              <button
                onClick={handleCopyInviteCode}
                title={`Invite code: ${household.invite_code}`}
                className={`
                  hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                  ${copied 
                    ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300" 
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  }
                `}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="font-mono">{household.invite_code}</span>
                  </>
                )}
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" strokeWidth={2} />
              ) : (
                <Moon className="w-4 h-4" strokeWidth={2} />
              )}
            </button>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh items"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
            </button>

            {/* Demo: guests get sign-in instead of an account menu */}
            {demoMode && (
              <Link
                href="/login?source=demo"
                className="hidden sm:flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Sign in
              </Link>
            )}

            {/* User menu dropdown */}
            {!demoMode && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 animate-fade-in">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile?.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                  </div>

                  {/* Household info (mobile) */}
                  {household && (
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 sm:hidden">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{categoryConfig.emoji}</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{household.name}</span>
                      </div>
                      <button
                        onClick={handleCopyInviteCode}
                        className={`
                          flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all
                          ${copied 
                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                          }
                        `}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="font-mono">{household.invite_code}</span>
                        <span className="text-slate-400 dark:text-slate-500 ml-auto">{copied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  )}

                  {/* Members list */}
                  {members.length > 0 && (
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                        Household Members
                      </p>
                      <div className="flex flex-col gap-1">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            </div>
                            <span>{member.full_name}</span>
                            {member.id === profile?.id && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">(you)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Menu actions */}
                  <div className="px-2 py-1">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Add Item CTA */}
            <button
              onClick={onAddClick}
              aria-label={`Add new ${categoryConfig.label.toLowerCase()}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Add {categoryConfig.emoji}</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

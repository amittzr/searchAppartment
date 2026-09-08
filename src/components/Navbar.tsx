"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Home, Plus, RefreshCw, LogOut, Copy, Check, 
  ChevronDown, User, Users, Settings
} from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";

interface NavbarProps {
  onAddClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Navbar({ onAddClick, onRefresh, isRefreshing }: NavbarProps) {
  const { 
    household, 
    profile, 
    members,
    categoryConfig, 
    signOut, 
    copyInviteCode 
  } = useHousehold();

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
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand / Logo + Household ────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md">
              <Home className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            
            {/* Brand + Household info */}
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  GroupPick
                </h1>
                {household && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-medium hidden sm:inline-flex items-center gap-1">
                    <span>{categoryConfig.emoji}</span>
                    <span>{categoryConfig.label}</span>
                  </span>
                )}
              </div>
              {household && (
                <p className="text-xs text-slate-500 font-medium hidden sm:block">
                  {household.name}
                  {members.length > 0 && (
                    <span className="text-slate-400"> · {members.length} {members.length === 1 ? "member" : "members"}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Invite code copy button */}
            {household?.invite_code && (
              <button
                onClick={handleCopyInviteCode}
                title={`Invite code: ${household.invite_code}`}
                className={`
                  hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                  ${copied 
                    ? "bg-green-50 border-green-300 text-green-700" 
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
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

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh items"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
            </button>

            {/* User menu dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-600" />
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-fade-in">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
                    <p className="text-xs text-slate-500">{profile?.email}</p>
                  </div>

                  {/* Household info (mobile) */}
                  {household && (
                    <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{categoryConfig.emoji}</span>
                        <span className="text-sm font-medium text-slate-700">{household.name}</span>
                      </div>
                      <button
                        onClick={handleCopyInviteCode}
                        className={`
                          flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all
                          ${copied 
                            ? "bg-green-50 text-green-700" 
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }
                        `}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="font-mono">{household.invite_code}</span>
                        <span className="text-slate-400 ml-auto">{copied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  )}

                  {/* Members list */}
                  {members.length > 0 && (
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                        Household Members
                      </p>
                      <div className="flex flex-col gap-1">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-slate-500" />
                            </div>
                            <span>{member.full_name}</span>
                            {member.id === profile?.id && (
                              <span className="text-xs text-slate-400">(you)</span>
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
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

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

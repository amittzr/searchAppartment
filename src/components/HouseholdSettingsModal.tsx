"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Users, User, Home, Copy, Check, LogOut, Pencil, Save, Loader2,
  Download, Share, Share2, CheckCircle2, Bell, BellOff, BellRing, Trash2, AlertTriangle,
} from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { getSupabaseClient } from "@/lib/supabase-client";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ============================================================
// Household Settings Modal
// Shows household info and allows copying/editing invite code
// ============================================================

interface HouseholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HouseholdSettingsModal({
  isOpen,
  onClose,
}: HouseholdSettingsModalProps) {
  const {
    profile,
    household,
    members,
    categoryConfig,
    copyInviteCode,
    signOut,
    refreshProfile,
  } = useHousehold();

  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  
  // Edit invite code state
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // PWA install state
  const { isInstallable, isIOS, isAndroid, isInstalled, promptInstall } = usePWAInstall();

  // Push notification state
  const {
    isSupported:  pushSupported,
    isSubscribed: pushSubscribed,
    isLoading:    pushLoading,
    error:        pushError,
    permission:   pushPermission,
    subscribe:    pushSubscribe,
    unsubscribe:  pushUnsubscribe,
  } = usePushNotifications();

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting,          setDeleting]          = useState(false);
  const [deleteError,       setDeleteError]        = useState<string | null>(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditingCode) {
          setIsEditingCode(false);
          setCodeError(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, isEditingCode]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleCopyInviteCode = async () => {
    const success = await copyInviteCode();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };

  const startEditingCode = () => {
    setNewInviteCode(household?.invite_code || "");
    setIsEditingCode(true);
    setCodeError(null);
  };

  const cancelEditingCode = () => {
    setIsEditingCode(false);
    setNewInviteCode("");
    setCodeError(null);
  };

  const saveInviteCode = async () => {
    if (!household) return;
    
    const cleanCode = newInviteCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (cleanCode.length < 4) {
      setCodeError("Code must be at least 4 characters");
      return;
    }
    
    if (cleanCode === household.invite_code) {
      setIsEditingCode(false);
      return;
    }

    setSavingCode(true);
    setCodeError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await (supabase
        .from("households") as any)
        .update({ invite_code: cleanCode })
        .eq("id", household.id);

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setCodeError("This code is already taken");
        } else {
          setCodeError(error.message);
        }
        return;
      }

      // Refresh to get updated household data
      await refreshProfile();
      setIsEditingCode(false);
      setNewInviteCode("");
    } catch {
      setCodeError("Failed to update code");
    } finally {
      setSavingCode(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Deletion failed. Please try again.");
        return;
      }
      // Account deleted — sign out and redirect to login
      await signOut();
    } catch (err) {
      setDeleteError("Unexpected error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 id="settings-title" className="text-lg font-bold text-slate-900">
                Household Settings
              </h2>
              <p className="text-sm text-slate-400">Manage your household</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">
            {/* Your Profile */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{profile?.full_name}</p>
                  <p className="text-sm text-slate-500">{profile?.email}</p>
                </div>
              </div>
            </div>

            {/* Household Info */}
            {household && (
              <div className="p-4 rounded-xl bg-brand-50 border border-brand-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{categoryConfig.emoji}</span>
                  <div>
                    <p className="font-medium text-brand-900">{household.name}</p>
                    <p className="text-sm text-brand-600">{categoryConfig.label}</p>
                  </div>
                </div>
                
                {/* Invite Code */}
                <div className="mt-4 pt-4 border-t border-brand-200">
                  <p className="text-xs font-medium text-brand-700 uppercase tracking-wide mb-2">
                    Invite Code
                  </p>
                  
                  {isEditingCode ? (
                    // Edit mode
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newInviteCode}
                          onChange={(e) => {
                            setNewInviteCode(e.target.value.toLowerCase());
                            setCodeError(null);
                          }}
                          placeholder="Enter new code"
                          maxLength={20}
                          autoFocus
                          className="flex-1 px-3 py-2 rounded-lg bg-white border border-brand-300 text-lg font-mono font-bold text-brand-700 tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                        <button
                          onClick={saveInviteCode}
                          disabled={savingCode}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                          {savingCode ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={cancelEditingCode}
                          disabled={savingCode}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {codeError && (
                        <p className="text-xs text-red-600">{codeError}</p>
                      )}
                      <p className="text-xs text-brand-600">
                        Letters and numbers only, at least 4 characters
                      </p>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-brand-200 text-lg font-mono font-bold text-brand-700 tracking-wider">
                        {household.invite_code}
                      </code>
                      <button
                        onClick={startEditingCode}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                        title="Edit invite code"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCopyInviteCode}
                        className={`
                          flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                          ${copied 
                            ? "bg-green-100 text-green-700 border border-green-300" 
                            : "bg-brand-600 text-white hover:bg-brand-700"
                          }
                        `}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  
                  {!isEditingCode && (
                    <p className="text-xs text-brand-600 mt-2">
                      Share this code with your partner so they can join your household
                    </p>
                  )}
                  {!isEditingCode && household?.invite_code && (
                    <InviteLinkShare inviteCode={household.invite_code} />
                  )}
                </div>
              </div>
            )}

            {/* ── Install App ──────────────────────────────────────────── */}
            {(isInstalled || isInstallable || isIOS || isAndroid) && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Install App
                </p>

                {/* Already installed */}
                {isInstalled && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>App is installed ✅</span>
                  </div>
                )}

                {/* Android — native prompt available */}
                {!isInstalled && isInstallable && (
                  <button
                    type="button"
                    onClick={promptInstall}
                    className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    📱 Install App
                  </button>
                )}

                {/* Android — prompt not yet available, show manual instructions */}
                {!isInstalled && isAndroid && !isInstallable && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm">
                    <p className="font-semibold mb-2 flex items-center gap-1.5">
                      <Download className="w-4 h-4" />
                      Add to Home Screen
                    </p>
                    <ol className="flex flex-col gap-1.5 text-slate-600 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">1.</span>
                        <span>Tap the <strong>⋮ menu</strong> (3 dots) in Chrome's top-right corner</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">2.</span>
                        <span>Tap <strong>"Add to Home screen"</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">3.</span>
                        <span>Tap <strong>Add</strong> — the app opens full-screen like a native app</span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* iOS — manual instructions */}
                {!isInstalled && isIOS && (
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-sm">
                    <p className="font-semibold mb-2 flex items-center gap-1.5">
                      <Home className="w-4 h-4" />
                      Add to Home Screen
                    </p>
                    <ol className="flex flex-col gap-1.5 text-sky-700 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">1.</span>
                        <span>
                          Tap the{" "}
                          <Share className="w-3.5 h-3.5 inline-block mx-0.5 -mt-0.5" />
                          <strong> Share</strong> button at the bottom of Safari
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">2.</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">3.</span>
                        <span>Tap <strong>Add</strong> — opens full-screen with no browser bar</span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* ── Notifications ────────────────────────────────────────── */}
            {pushSupported && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Notifications
                </p>

                {/* Blocked state */}
                {pushPermission === "denied" ? (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                    <BellOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Notifications blocked</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Enable them in your browser settings, then reload the page.
                      </p>
                    </div>
                  </div>
                ) : pushSubscribed ? (
                  /* Subscribed state — show disable button */
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                      <BellRing className="w-4 h-4" />
                      Notifications enabled 🔔
                    </div>
                    <button
                      type="button"
                      onClick={pushUnsubscribe}
                      disabled={pushLoading}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {pushLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BellOff className="w-3.5 h-3.5" />
                      )}
                      Turn off
                    </button>
                  </div>
                ) : (
                  /* Not subscribed — show enable button */
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={pushSubscribe}
                      disabled={pushLoading}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {pushLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      {pushLoading ? "Enabling…" : "Enable Notifications 🔔"}
                    </button>
                    <p className="text-xs text-slate-400 text-center">
                      Get notified when your partner adds a new item
                    </p>
                  </div>
                )}

                {/* Push error banner */}
                {pushError && (
                  <p className="text-xs text-red-500 px-1">{pushError}</p>
                )}
              </div>
            )}

            {/* Members List */}
            {members.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Household Members ({members.length})
                </p>
                <div className="flex flex-col gap-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-700">{member.full_name}</span>
                      {member.id === profile?.id && (
                        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {members.length === 1 && (
                  <p className="text-sm text-amber-600 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    Share the invite code above with your partner to start collaborating!
                  </p>
                )}
              </div>
            )}
            {/* ── Danger Zone ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 pt-2 border-t border-red-100">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                Danger Zone
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  Delete My Account &amp; Data
                </button>
              ) : (
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">
                      This is permanent and cannot be undone.
                    </p>
                  </div>
                  <p className="text-xs text-red-600">
                    Your profile, push subscriptions, and reactions will be permanently deleted.
                    Shared items in your household will remain for your partner.
                  </p>

                  {deleteError && (
                    <p className="text-xs text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                      {deleteError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                      disabled={deleting}
                      className="flex-1 py-2 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {deleting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting…</>
                      ) : (
                        <>Yes, delete everything</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// InviteLinkShare
// Displays the deep-link invite URL with copy and native share.
// ============================================================

function InviteLinkShare({ inviteCode }: { inviteCode: string }) {
  const [copiedLink, setCopiedLink] = useState(false);

  // Build the full URL client-side (safe: window only accessed in browser)
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteCode}`
      : `/join/${inviteCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Join my JustPick household",
        text:  "Tap the link to join my household on JustPick and start deciding together!",
        url:   inviteUrl,
      });
    } catch {
      // User dismissed the share sheet — not an error
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* URL display box */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
        <span className="text-xs text-slate-400 flex-1 truncate select-all font-mono">
          {inviteUrl}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Copy link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
            transition-all active:scale-95
            ${copiedLink
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }
          `}
        >
          {copiedLink ? (
            <><Check className="w-3.5 h-3.5" /> Copied!</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy Link</>
          )}
        </button>

        {/* Native share (mobile) — hidden when Web Share API unavailable */}
        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 active:scale-95 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}

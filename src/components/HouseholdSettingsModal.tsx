"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Users, User, Home, RotateCcw } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";

// ============================================================
// Household Settings Modal
// Allows users to configure their identity and household
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
    username,
    partnerName,
    householdId,
    setUsername,
    setPartnerName,
    setHouseholdId,
    resetToDefaults,
  } = useHousehold();

  // Local form state
  const [localUsername, setLocalUsername] = useState(username);
  const [localPartnerName, setLocalPartnerName] = useState(partnerName);
  const [localHouseholdId, setLocalHouseholdId] = useState(householdId);

  // Sync local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalUsername(username);
      setLocalPartnerName(partnerName);
      setLocalHouseholdId(householdId);
    }
  }, [isOpen, username, partnerName, householdId]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
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

  const handleSave = () => {
    setUsername(localUsername);
    setPartnerName(localPartnerName);
    setHouseholdId(localHouseholdId);
    onClose();
  };

  const handleReset = () => {
    resetToDefaults();
    onClose();
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
              <p className="text-sm text-slate-400">Configure your profile</p>
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
            {/* Your Name */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                Your Name
              </label>
              <input
                type="text"
                value={localUsername}
                onChange={(e) => setLocalUsername(e.target.value)}
                placeholder="e.g., Amit"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent hover:border-slate-300"
              />
              <p className="text-xs text-slate-400">
                This name appears on your reactions
              </p>
            </div>

            {/* Partner Name */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                Partner's Name
              </label>
              <input
                type="text"
                value={localPartnerName}
                onChange={(e) => setLocalPartnerName(e.target.value)}
                placeholder="e.g., Noa"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent hover:border-slate-300"
              />
              <p className="text-xs text-slate-400">
                Your partner's name for their reactions
              </p>
            </div>

            {/* Household ID */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Home className="w-4 h-4 text-slate-400" />
                Household ID
              </label>
              <input
                type="text"
                value={localHouseholdId}
                onChange={(e) => setLocalHouseholdId(e.target.value)}
                placeholder="e.g., amit-noa-2024"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent hover:border-slate-300"
              />
              <p className="text-xs text-slate-400">
                Shared ID to sync with your partner. Use the same ID on both devices.
              </p>
            </div>

            {/* Info box */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700">
                <strong>Tip:</strong> Share the same Household ID with your partner 
                so you both see the same apartments and can react to them together.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

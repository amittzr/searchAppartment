"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { HouseholdState } from "@/types/database";

// ============================================================
// Household Context
// Manages multi-tenant household isolation and user identity
// ============================================================

const STORAGE_KEY = "apartment-tracker-household";

// Default state for new users
const DEFAULT_STATE: HouseholdState = {
  householdId: "default-family",
  username: "Partner 1",
  partnerName: "Partner 2",
};

interface HouseholdContextValue extends HouseholdState {
  // Actions
  setUsername: (name: string) => void;
  setPartnerName: (name: string) => void;
  setHouseholdId: (id: string) => void;
  resetToDefaults: () => void;
  // Computed
  isConfigured: boolean;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

// ============================================================
// Provider Component
// ============================================================

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HouseholdState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<HouseholdState>;
        setState({
          householdId: parsed.householdId || DEFAULT_STATE.householdId,
          username: parsed.username || DEFAULT_STATE.username,
          partnerName: parsed.partnerName || DEFAULT_STATE.partnerName,
        });
      }
    } catch (err) {
      console.error("Failed to load household state:", err);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error("Failed to save household state:", err);
      }
    }
  }, [state, isHydrated]);

  // Actions
  const setUsername = useCallback((name: string) => {
    setState((prev) => ({ ...prev, username: name.trim() || DEFAULT_STATE.username }));
  }, []);

  const setPartnerName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, partnerName: name.trim() || DEFAULT_STATE.partnerName }));
  }, []);

  const setHouseholdId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, householdId: id.trim() || DEFAULT_STATE.householdId }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  // Check if user has customized their settings
  const isConfigured =
    state.username !== DEFAULT_STATE.username ||
    state.partnerName !== DEFAULT_STATE.partnerName ||
    state.householdId !== DEFAULT_STATE.householdId;

  const value: HouseholdContextValue = {
    ...state,
    setUsername,
    setPartnerName,
    setHouseholdId,
    resetToDefaults,
    isConfigured,
  };

  // Prevent hydration mismatch by rendering children only after hydration
  if (!isHydrated) {
    return null;
  }

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

// ============================================================
// Hook to use Household Context
// ============================================================

export function useHousehold(): HouseholdContextValue {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHousehold must be used within a HouseholdProvider");
  }
  return context;
}

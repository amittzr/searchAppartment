"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import AuthGateModal from "@/components/AuthGateModal";

// ============================================================
// AuthGateContext
//
// Lets the demo playground intercept high-intent actions with the
// signup modal. Outside the demo (the real dashboard) no provider
// exists, so useAuthGate() returns a harmless default.
// ============================================================

/** Why the modal was opened. Drives the headline only; the body copy is shared. */
export type AuthGateReason = "add" | "like" | "match" | "comment" | "invite" | "edit" | "delete";

interface AuthGateContextValue {
  /** True only inside the /demo playground. */
  isDemo: boolean;
  /** Opens the signup modal for the given high-intent action. */
  requireAuth: (reason: AuthGateReason) => void;
}

const DEFAULT_VALUE: AuthGateContextValue = {
  isDemo: false,
  requireAuth: () => {},
};

const AuthGateContext = createContext<AuthGateContextValue>(DEFAULT_VALUE);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<AuthGateReason | null>(null);

  const requireAuth = useCallback((nextReason: AuthGateReason) => setReason(nextReason), []);

  const value = useMemo<AuthGateContextValue>(
    () => ({ isDemo: true, requireAuth }),
    [requireAuth]
  );

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <AuthGateModal reason={reason} onClose={() => setReason(null)} />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateContextValue {
  return useContext(AuthGateContext);
}

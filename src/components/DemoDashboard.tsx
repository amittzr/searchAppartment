"use client";

import { Suspense, useMemo, useState } from "react";

import Dashboard, { type DashboardActivity } from "@/components/Dashboard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { AuthGateProvider } from "@/contexts/AuthGateContext";
import { HouseholdContext, type HouseholdContextValue } from "@/contexts/HouseholdContext";
import { useDemoApartments } from "@/hooks/useDemoApartments";
import { CATEGORY_CONFIGS } from "@/types/database";
import {
  DEMO_HOUSEHOLD,
  DEMO_MEMBERS,
  DEMO_PARTNER_NAME,
  DEMO_PROFILE,
  DEMO_USER_NAME,
  createDemoActivity,
} from "@/lib/demo-data";

// ============================================================
// DemoDashboard
//
// Public playground. Supplies mock household data through the same
// HouseholdContext the real app uses, so every dashboard component
// (cards, gallery, checklist, filters, map) works unchanged and no
// Supabase session is needed.
// ============================================================

// Demo visitors have no account, so these actions are no-ops by design
// (the dashboard intercepts the real entry points with the signup modal).
const noopAsync = async () => {};

const DEMO_CONTEXT_VALUE: HouseholdContextValue = {
  user: null,
  profile: DEMO_PROFILE,
  household: DEMO_HOUSEHOLD,
  members: DEMO_MEMBERS,
  isLoading: false,
  isAuthenticated: false,
  hasHousehold: true,
  category: DEMO_HOUSEHOLD.category,
  categoryConfig: CATEGORY_CONFIGS[DEMO_HOUSEHOLD.category],
  username: DEMO_USER_NAME,
  partnerName: DEMO_PARTNER_NAME,
  signOut: noopAsync,
  refreshProfile: noopAsync,
  copyInviteCode: async () => false,
};

export default function DemoDashboard() {
  return (
    <HouseholdContext.Provider value={DEMO_CONTEXT_VALUE}>
      <AuthGateProvider>
        <Suspense fallback={<LoadingSkeleton count={2} />}>
          <DemoDashboardContent />
        </Suspense>
      </AuthGateProvider>
    </HouseholdContext.Provider>
  );
}

function DemoDashboardContent() {
  const data = useDemoApartments();
  const [entries] = useState(() => createDemoActivity());

  const activity = useMemo<DashboardActivity>(
    () => ({ entries, loading: false, logEvent: noopAsync, refetch: noopAsync }),
    [entries]
  );

  return <Dashboard mode="demo" data={data} activity={activity} />;
}

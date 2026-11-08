"use client";

import { Suspense } from "react";

import Dashboard from "@/components/Dashboard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useApartments } from "@/hooks/useApartments";

// Live dashboard: Supabase-backed data, requires an authenticated session
// (enforced by middleware). The shared UI lives in components/Dashboard.tsx;
// the public playground at /demo reuses it with mock data.
export default function DashboardPage() {
  return (
    <HouseholdProvider>
      <Suspense fallback={<LoadingSkeleton count={6} />}>
        <LiveDashboard />
      </Suspense>
    </HouseholdProvider>
  );
}

function LiveDashboard() {
  const data = useApartments();
  const activity = useActivityLog();
  return <Dashboard mode="live" data={data} activity={activity} />;
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, Users, ArrowRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import JustPickLogo from "@/components/JustPickLogo";

// ============================================================
// /join/[code] — Deep Link Invite Page
//
// Handles two scenarios:
//   A. User is already logged in and has NO household:
//      → joins immediately, redirects to /
//   B. User is already logged in and HAS a household:
//      → shows confirmation before switching
//   C. User is NOT logged in:
//      → redirects to /signup?invite=[code] so signup pre-fills
//        the code; after signup the user lands on onboarding
//        with the code already entered
// ============================================================

type PageState =
  | "loading"        // resolving auth + household lookup
  | "previewing"     // showing household info before joining
  | "confirming"     // already in a household — asks if they want to switch
  | "joining"        // join in progress
  | "success"        // joined successfully
  | "error"          // something went wrong
  | "not_found";     // invite code doesn't exist

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = getSupabaseClient();

  // Normalise the code: always lowercase, strip leading/trailing whitespace
  const code = (params.code as string ?? "").toLowerCase().trim();

  const [state,         setState]         = useState<PageState>("loading");
  const [targetHousehold, setTargetHousehold] = useState<{
    id: string; name: string; category: string;
  } | null>(null);
  const [currentHousehold, setCurrentHousehold] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // ── On mount: resolve who the user is and what the code points to ─────────
  useEffect(() => {
    if (!code) {
      setState("not_found");
      return;
    }

    const resolve = async () => {
      // 1. Check auth state
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in — redirect to signup, passing the invite code as a query param
        // The signup page will store it in sessionStorage; onboarding picks it up
        router.replace(`/signup?invite=${encodeURIComponent(code)}`);
        return;
      }

      // 2. Look up the invite code
      const { data: household, error: hErr } = await (supabase
        .from("households") as any)
        .select("id, name, category")
        .eq("invite_code", code)
        .single() as { data: { id: string; name: string; category: string } | null; error: any };

      if (hErr || !household) {
        setState("not_found");
        return;
      }

      setTargetHousehold(household);

      // 3. Check if the user already has a household
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("household_id")
        .eq("id", user.id)
        .single() as { data: { household_id: string | null } | null };

      const existingHouseholdId = profile?.household_id ?? null;

      if (existingHouseholdId === household.id) {
        // Already in THIS household — just go home
        router.replace("/");
        return;
      }

      setCurrentHousehold(existingHouseholdId);

      if (existingHouseholdId) {
        // They're in a different household — show a switch confirmation
        setState("confirming");
      } else {
        // No household yet — show a simple join preview
        setState("previewing");
      }
    };

    resolve();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join action ───────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!targetHousehold) return;
    setState("joining");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?invite=${encodeURIComponent(code)}`);
      return;
    }

    const { error } = await (supabase
      .from("profiles") as any)
      .update({ household_id: targetHousehold.id })
      .eq("id", user.id);

    if (error) {
      setErrorMessage(error.message);
      setState("error");
      return;
    }

    setState("success");
    // Give the success animation a moment to display, then redirect
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1400);
  };

  // ── Category label helper ─────────────────────────────────────────────────
  const categoryLabel = (cat: string) => {
    if (cat === "apartment")   return "🏠 Apartments";
    if (cat === "bride_venue") return "👰 Bride Venues";
    if (cat === "car")         return "🚗 Cars";
    return cat;
  };

  // ── Render states ─────────────────────────────────────────────────────────

  if (state === "loading" || state === "joining") {
    return (
      <CenteredLayout>
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto" />
        <p className="text-sm text-slate-500 mt-4 text-center">
          {state === "joining" ? "Joining household…" : "Loading…"}
        </p>
      </CenteredLayout>
    );
  }

  if (state === "success") {
    return (
      <CenteredLayout>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 text-center mt-4">You&apos;re in!</h2>
        <p className="text-sm text-slate-500 text-center mt-1">
          Welcome to <strong>{targetHousehold?.name}</strong>
        </p>
      </CenteredLayout>
    );
  }

  if (state === "not_found") {
    return (
      <CenteredLayout>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 text-center mt-4">
          Invalid Invite Link
        </h2>
        <p className="text-sm text-slate-500 text-center mt-1 max-w-xs">
          This invite code doesn&apos;t exist or has been changed. Ask your partner to
          share the current code from Settings.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          Go to JustPick
        </Link>
      </CenteredLayout>
    );
  }

  if (state === "error") {
    return (
      <CenteredLayout>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 text-center mt-4">
          Something went wrong
        </h2>
        <p className="text-sm text-red-500 text-center mt-1 max-w-xs">{errorMessage}</p>
        <button
          onClick={() => setState(currentHousehold ? "confirming" : "previewing")}
          className="mt-5 text-sm text-violet-600 hover:underline"
        >
          Try again
        </button>
      </CenteredLayout>
    );
  }

  // ── Preview / Confirm states (main invite card) ───────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <JustPickLogo size="lg" />
          <h1 className="text-xl font-bold text-slate-900">JustPick</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 flex flex-col gap-5">

          {/* Household preview */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200">
            <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-violet-900">{targetHousehold?.name}</p>
              <p className="text-xs text-violet-600 mt-0.5">
                {categoryLabel(targetHousehold?.category ?? "")}
              </p>
            </div>
          </div>

          {/* Switch warning (only shown in "confirming" state) */}
          {state === "confirming" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                You&apos;re already in a different household. Joining this one will
                remove you from your current group.
              </span>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-slate-600">
              {state === "confirming"
                ? "Switch to this household?"
                : "Your partner invited you to join their household."}
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={handleJoin}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white text-sm font-semibold shadow-md hover:from-violet-600 hover:to-blue-700 active:scale-95 transition-all"
          >
            {state === "confirming" ? "Switch Household" : "Join Household"}
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/"
            className="text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Not now — go to the app
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Shared centered layout for status screens ─────────────────────────────────
function CenteredLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center py-16">
        {children}
      </div>
    </div>
  );
}

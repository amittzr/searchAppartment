"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Home, Users, Plus, UserPlus, Loader2, AlertCircle, 
  Copy, Check, Car, Heart
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { CategoryType } from "@/types/database";
import { CATEGORY_CONFIGS } from "@/types/database";

type OnboardingStep = "choice" | "create" | "join";

const CATEGORY_OPTIONS: { id: CategoryType; label: string; emoji: string; description: string }[] = [
  { id: "apartment", label: "Apartments", emoji: "🏠", description: "Track rental apartments or homes" },
  { id: "bride_venue", label: "Bride Venues", emoji: "👰", description: "Compare wedding preparation venues" },
  { id: "car", label: "Cars", emoji: "🚗", description: "Compare vehicles to purchase" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [step, setStep] = useState<OnboardingStep>("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Create household form
  const [householdName, setHouseholdName] = useState("");
  const [category, setCategory] = useState<CategoryType>("apartment");
  const [customInviteCode, setCustomInviteCode] = useState(""); // Optional custom code
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Join household form
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    // Get current user
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      // Check if user already has a household
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("household_id")
        .eq("id", user.id)
        .single() as { data: { household_id: string | null } | null };

      if (profile?.household_id) {
        // Already has household - redirect to home
        router.replace("/");
      }
    };
    checkUser();
  }, [supabase, router]);

  const handleCreateHousehold = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdName.trim() || !userId) return;

    setLoading(true);
    setError(null);

    try {
      // Build insert data - include custom invite code if provided
      const insertData: Record<string, unknown> = {
        name: householdName.trim(),
        category,
        created_by: userId,
      };
      
      // Add custom invite code if provided (must be lowercase, alphanumeric)
      if (customInviteCode.trim()) {
        const cleanCode = customInviteCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanCode.length < 4) {
          setError("Invite code must be at least 4 characters");
          setLoading(false);
          return;
        }
        insertData.invite_code = cleanCode;
      }

      // Create household
      const { data: household, error: createError } = await (supabase
        .from("households") as any)
        .insert(insertData)
        .select()
        .single() as { data: { id: string; invite_code: string } | null; error: any };

      if (createError) {
        if (createError.message.includes('duplicate') || createError.message.includes('unique')) {
          setError("This invite code is already taken. Try a different one.");
        } else {
          setError(createError.message);
        }
        return;
      }

      if (!household) {
        setError("Failed to create household. Please try again.");
        return;
      }

      // Update profile with household_id (create)
      const { error: updateError } = await (supabase
        .from("profiles") as any)
        .update({ household_id: household.id })
        .eq("id", userId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Show invite code to user
      setCreatedInviteCode(household.invite_code);
    } catch {
      setError("Failed to create household. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !userId) return;

    setLoading(true);
    setError(null);

    try {
      // Find household by invite code
      const { data: household, error: findError } = await (supabase
        .from("households") as any)
        .select("id, name, category")
        .eq("invite_code", inviteCode.trim().toLowerCase())
        .single() as { data: { id: string; name: string; category: string } | null; error: any };

      if (findError || !household) {
        setError("Invalid invite code. Please check and try again.");
        return;
      }

      // Update profile with household_id (join)
      const { error: updateError } = await (supabase
        .from("profiles") as any)
        .update({ household_id: household.id })
        .eq("id", userId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Redirect to home
      router.replace("/");
      router.refresh();
    } catch {
      setError("Failed to join household. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (createdInviteCode) {
      navigator.clipboard.writeText(createdInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToApp = () => {
    router.replace("/");
    router.refresh();
  };

  // Success state after creating household
  if (createdInviteCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Household Created!</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Share this invite code with your partner so they can join:
                </p>
              </div>

              {/* Invite code display */}
              <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-2xl font-mono font-bold text-brand-600 tracking-wider">
                    {createdInviteCode}
                  </code>
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors text-sm font-medium"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <button
                onClick={goToApp}
                className="w-full py-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150"
              >
                Start Using GroupPick
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg">
            <Home className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Welcome to GroupPick</h1>
            <p className="text-sm text-slate-500 mt-1">Let&apos;s set up your household</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
          {/* Choice step */}
          {step === "choice" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-slate-800 text-center mb-2">
                How would you like to start?
              </h2>

              <button
                onClick={() => setStep("create")}
                className="flex items-center gap-4 w-full p-4 rounded-xl border-2 border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                  <Plus className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Create a Household</h3>
                  <p className="text-sm text-slate-500">Start fresh and invite your partner</p>
                </div>
              </button>

              <button
                onClick={() => setStep("join")}
                className="flex items-center gap-4 w-full p-4 rounded-xl border-2 border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <UserPlus className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Join a Household</h3>
                  <p className="text-sm text-slate-500">Enter an invite code from your partner</p>
                </div>
              </button>
            </div>
          )}

          {/* Create household step */}
          {step === "create" && (
            <form onSubmit={handleCreateHousehold} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="text-sm text-slate-500 hover:text-slate-700 self-start flex items-center gap-1"
              >
                ← Back
              </button>

              <h2 className="text-lg font-semibold text-slate-800">Create your Household</h2>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Household name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Household Name
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="e.g., Amit & Noa"
                    className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What are you tracking?
                </label>
                <div className="grid gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategory(opt.id)}
                      className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 transition-all text-left ${
                        category === opt.id
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div>
                        <h4 className="font-medium text-slate-800">{opt.label}</h4>
                        <p className="text-xs text-slate-500">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom invite code (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Custom Invite Code <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customInviteCode}
                  onChange={(e) => setCustomInviteCode(e.target.value.toLowerCase())}
                  placeholder="e.g., amitnoa2024 (or leave empty for auto)"
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">Letters and numbers only, at least 4 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading || !householdName.trim()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating..." : "Create Household"}
              </button>
            </form>
          )}

          {/* Join household step */}
          {step === "join" && (
            <form onSubmit={handleJoinHousehold} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="text-sm text-slate-500 hover:text-slate-700 self-start flex items-center gap-1"
              >
                ← Back
              </button>

              <h2 className="text-lg font-semibold text-slate-800">Join a Household</h2>
              <p className="text-sm text-slate-500 -mt-2">
                Enter the invite code your partner shared with you
              </p>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Invite code input */}
              <div className="relative">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  maxLength={8}
                  className="w-full px-4 py-4 rounded-xl border border-slate-200 text-center text-xl font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-purple-600 hover:to-purple-800 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Joining..." : "Join Household"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

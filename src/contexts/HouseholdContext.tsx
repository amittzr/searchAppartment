"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { 
  Profile, 
  Household, 
  HouseholdMember, 
  CategoryType,
  CategoryConfig,
  CATEGORY_CONFIGS
} from "@/types/database";
import { CATEGORY_CONFIGS as CONFIGS } from "@/types/database";
import type { User } from "@supabase/supabase-js";

// ============================================================
// Household Context - Real Auth Version
// Manages authentication, profile, and household data
// ============================================================

interface HouseholdContextValue {
  // Auth state
  user: User | null;
  profile: Profile | null;
  household: Household | null;
  members: HouseholdMember[];
  
  // Loading states
  isLoading: boolean;
  isAuthenticated: boolean;
  hasHousehold: boolean;
  
  // Category helpers
  category: CategoryType;
  categoryConfig: CategoryConfig;
  
  // Current user info (for reactions)
  username: string;
  partnerName: string;
  
  // Actions
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  copyInviteCode: () => Promise<boolean>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

// ============================================================
// Provider Component
// ============================================================

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile and household data
  const fetchProfileData = useCallback(async (userId: string) => {
    try {
      // Fetch profile with household
      const { data: profileData, error: profileError } = await (supabase
        .from("profiles") as any)
        .select("*")
        .eq("id", userId)
        .single() as { data: Profile | null; error: any };

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      setProfile(profileData);

      if (profileData?.household_id) {
        // Fetch household
        const { data: householdData, error: householdError } = await (supabase
          .from("households") as any)
          .select("*")
          .eq("id", profileData.household_id)
          .single() as { data: Household | null; error: any };

        if (!householdError && householdData) {
          setHousehold(householdData);
        }

        // Fetch household members
        const { data: membersData, error: membersError } = await (supabase
          .from("profiles") as any)
          .select("id, full_name, avatar_url")
          .eq("household_id", profileData.household_id) as { data: HouseholdMember[] | null; error: any };

        if (!membersError && membersData) {
          setMembers(membersData);
        }
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
    }
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // Get current session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser(currentUser);
        await fetchProfileData(currentUser.id);
      }
      
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await fetchProfileData(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setHousehold(null);
          setMembers([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileData]);

  // Subscribe to realtime changes for household members
  useEffect(() => {
    if (!household?.id) return;

    const channel = supabase
      .channel(`household-${household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `household_id=eq.${household.id}`,
        },
        async () => {
          // Refresh members list
          const { data: membersData } = await (supabase
            .from("profiles") as any)
            .select("id, full_name, avatar_url")
            .eq("household_id", household.id) as { data: HouseholdMember[] | null };

          if (membersData) {
            setMembers(membersData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, household?.id]);

  // Actions
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfileData(user.id);
    }
  }, [user, fetchProfileData]);

  const copyInviteCode = useCallback(async (): Promise<boolean> => {
    if (household?.invite_code) {
      try {
        await navigator.clipboard.writeText(household.invite_code);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [household?.invite_code]);

  // Computed values
  const isAuthenticated = !!user;
  const hasHousehold = !!household;
  const category: CategoryType = household?.category || "apartment";
  const categoryConfig = CONFIGS[category];

  // User names for reactions
  const username = profile?.full_name || "You";
  const partner = members.find((m) => m.id !== user?.id);
  const partnerName = partner?.full_name || "Partner";

  const value: HouseholdContextValue = {
    user,
    profile,
    household,
    members,
    isLoading,
    isAuthenticated,
    hasHousehold,
    category,
    categoryConfig,
    username,
    partnerName,
    signOut,
    refreshProfile,
    copyInviteCode,
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
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

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useHousehold } from "@/contexts/HouseholdContext";
import type {
  Item,
  ItemInsert,
  ItemUpdate,
  ApartmentStatus,
  ReactionStatus,
  ReactionsMap,
  CategoryType,
  ItemMetadata,
} from "@/types/database";

// Aliases for backward compatibility
type Apartment = Item;
type ApartmentInsert = ItemInsert;
type ApartmentUpdate = ItemUpdate;

interface UseApartmentsReturn {
  apartments: Apartment[];
  loading: boolean;
  error: string | null;
  // CRUD operations
  addApartment: (data: Omit<ApartmentInsert, "household_id" | "category">) => Promise<{ error: string | null }>;
  updateApartment: (id: string, data: ApartmentUpdate) => Promise<{ error: string | null }>;
  deleteApartment: (id: string) => Promise<{ error: string | null }>;
  // Reaction operations
  setStatus: (id: string, status: ApartmentStatus) => Promise<{ error: string | null }>;
  setReaction: (id: string, reaction: ReactionStatus | null) => Promise<{ error: string | null }>;
  // Utility
  refetch: () => Promise<void>;
  // Match detection
  isMatch: (apt: Apartment) => boolean;
  getReactionCounts: (apt: Apartment) => { liked: number; review: number; rejected: number };
}

export function useApartments(): UseApartmentsReturn {
  const supabase = getSupabaseClient();
  const { household, username, members, category: householdCategory } = useHousehold();
  
  const householdId = household?.id;
  const category = householdCategory;

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch apartments scoped to household ────────────────────────────────────
  const fetchApartments = useCallback(async () => {
    if (!householdId) {
      setApartments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await (supabase
      .from("apartments") as any)
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      // Ensure reactions and metadata fields default to empty objects if null
      const normalized = (data ?? []).map((apt: any) => ({
        ...apt,
        reactions: apt.reactions ?? {},
        metadata: apt.metadata ?? {},
      })) as Apartment[];
      setApartments(normalized);
    }

    setLoading(false);
  }, [supabase, householdId]);

  // ── Real-time subscription scoped to household ──────────────────────────────
  useEffect(() => {
    fetchApartments();

    if (!householdId) return;

    const channel = supabase
      .channel(`apartments-${householdId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "apartments",
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          const newApt = {
            ...payload.new,
            reactions: (payload.new as Apartment).reactions ?? {},
            metadata: (payload.new as Apartment).metadata ?? {},
          } as Apartment;
          setApartments((prev) => [newApt, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "apartments",
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          const updatedApt = {
            ...payload.new,
            reactions: (payload.new as Apartment).reactions ?? {},
            metadata: (payload.new as Apartment).metadata ?? {},
          } as Apartment;
          setApartments((prev) =>
            prev.map((apt) =>
              apt.id === updatedApt.id ? updatedApt : apt
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "DELETE", 
          schema: "public", 
          table: "apartments",
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          setApartments((prev) =>
            prev.filter((apt) => apt.id !== (payload.old as Apartment).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchApartments, householdId]);

  // ── Create (auto-attach household_id and category) ──────────────────────────
  const addApartment = useCallback(
    async (data: Omit<ApartmentInsert, "household_id" | "category">): Promise<{ error: string | null }> => {
      if (!householdId) {
        return { error: "No household selected" };
      }

      const insertData: ApartmentInsert = {
        ...data,
        household_id: householdId,
        category: category,
        reactions: data.reactions ?? {},
        metadata: data.metadata ?? {},
      };

      const { error: insertError } = await (supabase
        .from("apartments") as any)
        .insert(insertData as object);

      if (insertError) return { error: insertError.message };
      return { error: null };
    },
    [supabase, householdId, category]
  );

  // ── Update ──────────────────────────────────────────────────────────────────
  const updateApartment = useCallback(
    async (id: string, data: ApartmentUpdate): Promise<{ error: string | null }> => {
      if (!householdId) {
        return { error: "No household selected" };
      }

      const { error: updateError } = await (supabase
        .from("apartments") as any)
        .update(data as object)
        .eq("id", id)
        .eq("household_id", householdId); // RLS will also enforce this

      if (updateError) return { error: updateError.message };
      return { error: null };
    },
    [supabase, householdId]
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteApartment = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      if (!householdId) {
        return { error: "No household selected" };
      }

      const { error: deleteError } = await (supabase
        .from("apartments") as any)
        .delete()
        .eq("id", id)
        .eq("household_id", householdId); // RLS will also enforce this

      if (deleteError) return { error: deleteError.message };
      return { error: null };
    },
    [supabase, householdId]
  );

  // ── Legacy status toggle (kept for backward compatibility) ──────────────────
  const setStatus = useCallback(
    async (id: string, status: ApartmentStatus): Promise<{ error: string | null }> => {
      return updateApartment(id, { status });
    },
    [updateApartment]
  );

  // ── Set per-user reaction (uses current username from context) ──────────────
  const setReaction = useCallback(
    async (
      id: string,
      reaction: ReactionStatus | null
    ): Promise<{ error: string | null }> => {
      // Find the apartment
      const apartment = apartments.find((apt) => apt.id === id);
      if (!apartment) {
        return { error: "Item not found" };
      }

      // Build new reactions object
      const newReactions: ReactionsMap = { ...apartment.reactions };
      if (reaction === null) {
        // Remove the user's reaction
        delete newReactions[username];
      } else {
        // Set/update the user's reaction
        newReactions[username] = reaction;
      }

      return updateApartment(id, { reactions: newReactions });
    },
    [apartments, updateApartment, username]
  );

  // ── Match detection: all household members liked ────────────────────────────
  const isMatch = useCallback(
    (apt: Apartment): boolean => {
      if (members.length < 2) return false;
      
      const reactions = apt.reactions ?? {};
      return members.every((member) => reactions[member.full_name] === "liked");
    },
    [members]
  );

  // ── Get reaction counts ─────────────────────────────────────────────────────
  const getReactionCounts = useCallback(
    (apt: Apartment): { liked: number; review: number; rejected: number } => {
      const reactions = apt.reactions ?? {};
      const values = Object.values(reactions);
      
      return {
        liked: values.filter((r) => r === "liked").length,
        review: values.filter((r) => r === "review").length,
        rejected: values.filter((r) => r === "rejected").length,
      };
    },
    []
  );

  return {
    apartments,
    loading,
    error,
    addApartment,
    updateApartment,
    deleteApartment,
    setStatus,
    setReaction,
    refetch: fetchApartments,
    isMatch,
    getReactionCounts,
  };
}

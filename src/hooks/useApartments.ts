"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Apartment,
  ApartmentInsert,
  ApartmentUpdate,
  ApartmentStatus,
  ReactionStatus,
  ReactionsMap,
} from "@/types/database";

interface UseApartmentsReturn {
  apartments: Apartment[];
  loading: boolean;
  error: string | null;
  addApartment: (data: Omit<ApartmentInsert, "household_id">) => Promise<{ error: string | null }>;
  updateApartment: (id: string, data: ApartmentUpdate) => Promise<{ error: string | null }>;
  deleteApartment: (id: string) => Promise<{ error: string | null }>;
  setStatus: (id: string, status: ApartmentStatus) => Promise<{ error: string | null }>;
  setReaction: (id: string, username: string, reaction: ReactionStatus | null) => Promise<{ error: string | null }>;
  refetch: () => Promise<void>;
}

interface UseApartmentsOptions {
  householdId: string;
}

export function useApartments({ householdId }: UseApartmentsOptions): UseApartmentsReturn {
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

    const { data, error: fetchError } = await supabase
      .from("apartments")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      // Ensure reactions field defaults to empty object if null
      const normalized = (data ?? []).map((apt) => ({
        ...apt,
        reactions: apt.reactions ?? {},
      })) as Apartment[];
      setApartments(normalized);
    }

    setLoading(false);
  }, [householdId]);

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
  }, [fetchApartments, householdId]);

  // ── Create (auto-attach household_id) ───────────────────────────────────────
  const addApartment = useCallback(
    async (data: Omit<ApartmentInsert, "household_id">): Promise<{ error: string | null }> => {
      const insertData: ApartmentInsert = {
        ...data,
        household_id: householdId,
        reactions: data.reactions ?? {},
      };

      const { error: insertError } = await supabase
        .from("apartments")
        .insert(insertData as object);

      if (insertError) return { error: insertError.message };
      return { error: null };
    },
    [householdId]
  );

  // ── Update ──────────────────────────────────────────────────────────────────
  const updateApartment = useCallback(
    async (id: string, data: ApartmentUpdate): Promise<{ error: string | null }> => {
      const { error: updateError } = await supabase
        .from("apartments")
        .update(data as object)
        .eq("id", id)
        .eq("household_id", householdId); // Security: ensure ownership

      if (updateError) return { error: updateError.message };
      return { error: null };
    },
    [householdId]
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteApartment = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error: deleteError } = await supabase
        .from("apartments")
        .delete()
        .eq("id", id)
        .eq("household_id", householdId); // Security: ensure ownership

      if (deleteError) return { error: deleteError.message };
      return { error: null };
    },
    [householdId]
  );

  // ── Legacy status toggle (kept for backward compatibility) ──────────────────
  const setStatus = useCallback(
    async (id: string, status: ApartmentStatus): Promise<{ error: string | null }> => {
      return updateApartment(id, { status });
    },
    [updateApartment]
  );

  // ── Set per-user reaction ───────────────────────────────────────────────────
  // Updates a single user's reaction without overwriting partner's reaction
  const setReaction = useCallback(
    async (
      id: string,
      username: string,
      reaction: ReactionStatus | null
    ): Promise<{ error: string | null }> => {
      // First, get the current reactions
      const apartment = apartments.find((apt) => apt.id === id);
      if (!apartment) {
        return { error: "Apartment not found" };
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
    [apartments, updateApartment]
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
  };
}

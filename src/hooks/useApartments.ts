"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Apartment,
  ApartmentInsert,
  ApartmentUpdate,
  ApartmentStatus,
} from "@/types/database";

interface UseApartmentsReturn {
  apartments: Apartment[];
  loading: boolean;
  error: string | null;
  addApartment: (data: ApartmentInsert) => Promise<{ error: string | null }>;
  updateApartment: (id: string, data: ApartmentUpdate) => Promise<{ error: string | null }>;
  deleteApartment: (id: string) => Promise<{ error: string | null }>;
  setStatus: (id: string, status: ApartmentStatus) => Promise<{ error: string | null }>;
  refetch: () => Promise<void>;
}

export function useApartments(): UseApartmentsReturn {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all apartments, ordered newest first ──────────────────────────────
  const fetchApartments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("apartments")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setApartments(data ?? []);
    }

    setLoading(false);
  }, []);

  // ── Real-time subscription ──────────────────────────────────────────────────
  // Listens for INSERT / UPDATE / DELETE events on the apartments table so both
  // partners see changes instantly without a manual refresh.
  useEffect(() => {
    fetchApartments();

    const channel = supabase
      .channel("apartments-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "apartments" },
        (payload) => {
          // Prepend the new row to keep newest-first order
          setApartments((prev) => [payload.new as Apartment, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "apartments" },
        (payload) => {
          setApartments((prev) =>
            prev.map((apt) =>
              apt.id === (payload.new as Apartment).id
                ? (payload.new as Apartment)
                : apt
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "apartments" },
        (payload) => {
          setApartments((prev) =>
            prev.filter((apt) => apt.id !== (payload.old as Apartment).id)
          );
        }
      )
      .subscribe();

    // Cleanup: unsubscribe when the component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApartments]);

  // ── Create ──────────────────────────────────────────────────────────────────
  const addApartment = useCallback(
    async (data: ApartmentInsert): Promise<{ error: string | null }> => {
      const { error: insertError } = await supabase
        .from("apartments")
        .insert([data]);

      if (insertError) {
        return { error: insertError.message };
      }
      // Real-time INSERT event will update local state automatically
      return { error: null };
    },
    []
  );

  // ── Update ──────────────────────────────────────────────────────────────────
  const updateApartment = useCallback(
    async (
      id: string,
      data: ApartmentUpdate
    ): Promise<{ error: string | null }> => {
      const { error: updateError } = await supabase
        .from("apartments")
        .update(data)
        .eq("id", id);

      if (updateError) {
        return { error: updateError.message };
      }
      // Real-time UPDATE event will patch local state automatically
      return { error: null };
    },
    []
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteApartment = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error: deleteError } = await supabase
        .from("apartments")
        .delete()
        .eq("id", id);

      if (deleteError) {
        return { error: deleteError.message };
      }
      // Real-time DELETE event will remove it from local state automatically
      return { error: null };
    },
    []
  );

  // ── Quick status toggle (Liked / Review / Rejected) ─────────────────────────
  const setStatus = useCallback(
    async (
      id: string,
      status: ApartmentStatus
    ): Promise<{ error: string | null }> => {
      return updateApartment(id, { status });
    },
    [updateApartment]
  );

  return {
    apartments,
    loading,
    error,
    addApartment,
    updateApartment,
    deleteApartment,
    setStatus,
    refetch: fetchApartments,
  };
}

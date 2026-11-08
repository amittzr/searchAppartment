"use client";

import { useState, useCallback } from "react";
import { createDemoApartments, DEMO_USER_ID, DEMO_MEMBERS } from "@/lib/demo-data";
import type { UseApartmentsReturn } from "@/hooks/useApartments";
import type { Apartment, ChecklistData } from "@/types/database";

// ============================================================
// useDemoApartments
//
// In-memory twin of useApartments for the public /demo route.
// It never touches Supabase or any API. Only harmless local
// interactions (marking viewed, checklist edits) change state;
// every write that needs an account returns an error, and the
// dashboard intercepts those actions with the signup modal first.
// ============================================================

const SIGN_IN_REQUIRED = "Create a free account to save changes.";

export interface UseDemoApartmentsReturn extends UseApartmentsReturn {
  /** Applies a checklist edit to local state (demo-only counterpart of the DB write). */
  applyLocalChecklist: (id: string, data: ChecklistData) => void;
}

export function useDemoApartments(): UseDemoApartmentsReturn {
  const [apartments, setApartments] = useState<Apartment[]>(() => createDemoApartments());

  const rejectWrite = useCallback(async () => ({ error: SIGN_IN_REQUIRED }), []);

  const markAsViewed = useCallback(async (id: string): Promise<void> => {
    setApartments((prev) =>
      prev.map((apt) =>
        apt.id === id && !apt.viewed_by.includes(DEMO_USER_ID)
          ? { ...apt, viewed_by: [...apt.viewed_by, DEMO_USER_ID] }
          : apt
      )
    );
  }, []);

  const applyLocalChecklist = useCallback((id: string, data: ChecklistData) => {
    setApartments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, checklist_data: data } : apt))
    );
  }, []);

  const isMatch = useCallback((apt: Apartment): boolean => {
    return DEMO_MEMBERS.every((member) => apt.reactions?.[member.full_name] === "liked");
  }, []);

  const getReactionCounts = useCallback((apt: Apartment) => {
    const values = Object.values(apt.reactions ?? {});
    return {
      liked: values.filter((r) => r === "liked").length,
      review: values.filter((r) => r === "review").length,
      rejected: values.filter((r) => r === "rejected").length,
    };
  }, []);

  return {
    apartments,
    loading: false,
    error: null,
    addApartment: rejectWrite,
    updateApartment: rejectWrite,
    deleteApartment: rejectWrite,
    setStatus: rejectWrite,
    setReaction: rejectWrite,
    addComment: rejectWrite,
    markAsViewed,
    refetch: async () => {},
    isMatch,
    getReactionCounts,
    applyLocalChecklist,
  };
}

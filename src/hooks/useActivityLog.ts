"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useHousehold } from "@/contexts/HouseholdContext";
import type {
  ActivityLogEntry,
  ActivityLogInsert,
  ActivityEventType,
} from "@/types/database";

// ============================================================
// useActivityLog hook
//
// Provides:
//   - entries: last N activity log entries for the household
//   - loading: fetch state
//   - logEvent: append a new event (fire-and-forget)
//
// Real-time: subscribes to INSERT events on activity_log
// so both partners see updates instantly without polling.
// ============================================================

const MAX_ENTRIES = 30; // number of entries to display in the feed

export function useActivityLog() {
  const supabase = getSupabaseClient();
  const { household, user, profile } = useHousehold();

  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const householdId = household?.id;

  // ── Fetch recent entries ──────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    if (!householdId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase
      .from("activity_log") as any)
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(MAX_ENTRIES);

    if (!error && data) {
      setEntries(data as ActivityLogEntry[]);
    }
    setLoading(false);
  }, [supabase, householdId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Real-time subscription for new entries ────────────────────────────────
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`activity-log-${householdId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "activity_log",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const newEntry = payload.new as ActivityLogEntry;
          setEntries((prev) => {
            // Prepend and cap at MAX_ENTRIES
            const updated = [newEntry, ...prev];
            return updated.slice(0, MAX_ENTRIES);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, householdId]);

  // ── Log a new event (fire-and-forget from client) ─────────────────────────
  const logEvent = useCallback(
    async (
      eventType: ActivityEventType,
      extras: {
        itemId?:    string;
        itemTitle?: string;
        metadata?:  Record<string, unknown>;
      } = {}
    ): Promise<void> => {
      if (!householdId || !user || !profile) return;

      const insert: ActivityLogInsert = {
        household_id: householdId,
        user_id:      user.id,
        user_name:    profile.full_name,
        event_type:   eventType,
        item_id:      extras.itemId    ?? null,
        item_title:   extras.itemTitle ?? null,
        metadata:     extras.metadata  ?? {},
      };

      const { error } = await (supabase
        .from("activity_log") as any)
        .insert(insert);

      if (error) {
        // Activity logging is non-critical — log but don't surface to user
        console.warn("[useActivityLog] Failed to log event:", error.message);
      }
    },
    [supabase, householdId, user, profile]
  );

  return { entries, loading, logEvent, refetch: fetchEntries };
}

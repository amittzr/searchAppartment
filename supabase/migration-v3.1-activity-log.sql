-- ============================================================
-- JustPick v3.1 — Activity Log Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Creates a lightweight activity_log table to track key
-- group events for the "Recent Activity" feed.
--
-- Events tracked:
--   item_added    — user added a new apartment/item
--   item_deleted  — user deleted an item
--   reaction_set  — user reacted to an item
--   match         — all members liked the same item
--   note_added    — user added a comment/note to an item
--   member_joined — a new user joined the household
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name    text        NOT NULL,        -- denormalised for display after user deletion
  event_type   text        NOT NULL,        -- one of the event types listed above
  item_id      uuid        REFERENCES public.apartments(id) ON DELETE SET NULL,
  item_title   text,                        -- denormalised: item may be deleted later
  metadata     jsonb       DEFAULT '{}',   -- flexible extra data per event type
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index: most queries filter by household and order by time
CREATE INDEX IF NOT EXISTS idx_activity_log_household_time
  ON public.activity_log (household_id, created_at DESC);

-- Index: look up all events for a specific item (e.g. on delete)
CREATE INDEX IF NOT EXISTS idx_activity_log_item_id
  ON public.activity_log (item_id)
  WHERE item_id IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only read activity for their own household
CREATE POLICY "Users can view their household activity"
  ON public.activity_log FOR SELECT
  USING (household_id = public.get_my_household_id());

-- Inserts are performed server-side by API routes using authenticated sessions.
-- The WITH CHECK ensures a user can only log events for their own household.
CREATE POLICY "Users can insert activity for their household"
  ON public.activity_log FOR INSERT
  WITH CHECK (household_id = public.get_my_household_id());

-- No UPDATE or DELETE for end users — the log is append-only.
-- Old entries are automatically removed by the cleanup cron (keep last 30 days).

-- ── Auto-cleanup: keep only the last 30 days per household ───────────────────
-- This runs as a Postgres function called by the existing Vercel cron job.
CREATE OR REPLACE FUNCTION public.cleanup_old_activity()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.activity_log
  WHERE created_at < now() - interval '30 days';
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_activity() TO service_role;

-- ============================================================
-- Verify:
-- SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10;
-- ============================================================

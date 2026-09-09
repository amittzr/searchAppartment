-- ============================================================
-- GroupPick v2.1 — Read-Receipt (viewed_by) Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds a viewed_by column to apartments table.
-- Each element is a user ID (uuid) stored as a JSON array.
-- When an item is inserted, the trigger auto-populates it
-- with the creator's user ID so they never see "NEW" on
-- their own posts.
-- ============================================================

-- Step 1: Add the viewed_by column
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS viewed_by jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Step 2: Back-fill existing rows — mark all as seen by everyone
-- (existing items pre-date the feature, treat them as already read)
UPDATE public.apartments
SET viewed_by = (
  SELECT COALESCE(jsonb_agg(p.id::text), '[]'::jsonb)
  FROM public.profiles p
  WHERE p.household_id = apartments.household_id
);

-- Step 3: Index for fast containment checks (? operator on jsonb)
CREATE INDEX IF NOT EXISTS idx_apartments_viewed_by
  ON public.apartments USING gin (viewed_by);

-- ============================================================
-- Verify:
-- SELECT id, viewed_by FROM apartments LIMIT 5;
-- ============================================================

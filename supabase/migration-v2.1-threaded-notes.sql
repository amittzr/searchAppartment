-- ============================================================
-- GroupPick v2.1 — Threaded Notes Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Changes:
--   1. Converts apartments.notes from TEXT to JSONB array
--   2. Migrates existing text notes to the new array format
--      (attributed to "Legacy" since original author is unknown)
-- ============================================================

-- Step 1: Add a temporary column for the new JSONB format
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS notes_thread jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing non-null text notes into the thread format
-- Existing notes become a single entry attributed to "Legacy"
UPDATE public.apartments
SET notes_thread = jsonb_build_array(
  jsonb_build_object(
    'userId',    'legacy',
    'userName',  'Legacy',
    'text',      notes,
    'createdAt', created_at
  )
)
WHERE notes IS NOT NULL AND notes <> '';

-- Step 3: Drop the old text column and rename the new one
ALTER TABLE public.apartments DROP COLUMN IF EXISTS notes;
ALTER TABLE public.apartments RENAME COLUMN notes_thread TO notes;

-- Step 4: Ensure index exists for performance (optional but good practice)
-- No index needed for JSONB array of notes since it's not filtered

-- ============================================================
-- Verify:
-- SELECT id, notes FROM apartments LIMIT 5;
-- ============================================================

-- ============================================================
-- GroupPick v2.3 — Physical Inspection Checklist Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds a checklist_data column to the apartments table.
-- Stores per-item check state as a JSONB array of category objects.
-- Default is NULL — checklist is initialized client-side on first open.
-- ============================================================

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS checklist_data jsonb DEFAULT NULL;

-- ============================================================
-- Verify:
-- SELECT id, checklist_data FROM apartments LIMIT 3;
-- ============================================================

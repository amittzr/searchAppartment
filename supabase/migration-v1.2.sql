-- ============================================================
-- Apartment Tracker — Migration Script v1.2
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- 
-- This migration adds:
--   - household_id: multi-household/tenant isolation
--   - rooms: number of rooms field
--   - reactions: per-user reaction tracking (JSONB)
-- ============================================================

-- Add household_id column for multi-household support
-- Default 'default-family' ensures existing data remains accessible
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS household_id text NOT NULL DEFAULT 'default-family';

-- Add rooms column for bedroom count filtering
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS rooms text;

-- Add reactions JSONB column for per-user reaction tracking
-- Format: {"Username1": "liked", "Username2": "review"}
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';

-- ============================================================
-- Create new indexes for efficient filtering
-- ============================================================

-- Index for household-scoped queries (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_apartments_household_id 
ON public.apartments (household_id);

-- Index for rooms filtering
CREATE INDEX IF NOT EXISTS idx_apartments_rooms 
ON public.apartments (rooms);

-- Composite index for household + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_apartments_household_created 
ON public.apartments (household_id, created_at DESC);

-- ============================================================
-- Optional: Migrate existing status values to reactions
-- Uncomment and customize if you want to preserve old statuses
-- ============================================================

-- Migrate 'liked' status to reactions for a specific user
-- UPDATE public.apartments 
-- SET reactions = jsonb_set(COALESCE(reactions, '{}'), '{YourUsername}', '"liked"')
-- WHERE status = 'liked' AND (reactions IS NULL OR reactions = '{}');

-- Migrate 'review' status to reactions for a specific user  
-- UPDATE public.apartments 
-- SET reactions = jsonb_set(COALESCE(reactions, '{}'), '{YourUsername}', '"review"')
-- WHERE status = 'review' AND (reactions IS NULL OR reactions = '{}');

-- Migrate 'rejected' status to reactions for a specific user
-- UPDATE public.apartments 
-- SET reactions = jsonb_set(COALESCE(reactions, '{}'), '{YourUsername}', '"rejected"')
-- WHERE status = 'rejected' AND (reactions IS NULL OR reactions = '{}');

-- ============================================================
-- Verification: Check the new columns exist
-- ============================================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'apartments' 
-- AND column_name IN ('household_id', 'rooms', 'reactions');

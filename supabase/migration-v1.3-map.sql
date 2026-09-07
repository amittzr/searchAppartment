-- ============================================================
-- Apartment Tracker — Migration Script v1.3 (Map Feature)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- 
-- This migration adds:
--   - latitude: map coordinate
--   - longitude: map coordinate
-- ============================================================

-- Add latitude column for map coordinates
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS latitude double precision;

-- Add longitude column for map coordinates
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS longitude double precision;

-- ============================================================
-- Verification: Check the new columns exist
-- ============================================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'apartments' 
-- AND column_name IN ('latitude', 'longitude');

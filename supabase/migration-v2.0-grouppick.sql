-- ============================================================
-- GroupPick v2.0 — Multi-Tenant Auth Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- 
-- This migration:
--   1. Creates households table for group isolation
--   2. Creates profiles table linked to auth.users
--   3. Updates apartments table - converts household_id from text to uuid
--   4. Enables Row Level Security (RLS) with proper policies
-- ============================================================

-- ============================================================
-- 1. Households Table
-- Represents a group of users (couple, family, friends)
-- Each household has a category determining UI/fields
-- ============================================================
CREATE TABLE IF NOT EXISTS public.households (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text NOT NULL DEFAULT 'apartment' 
        CHECK (category IN ('apartment', 'bride_venue', 'car')),
    invite_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(4), 'hex'),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS idx_households_invite_code ON public.households (invite_code);

-- ============================================================
-- 2. Profiles Table
-- Links auth.users to household membership
-- Stores display name for reactions/badges
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text NOT NULL,
    avatar_url text,
    household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for household member lookups
CREATE INDEX IF NOT EXISTS idx_profiles_household_id ON public.profiles (household_id);

-- ============================================================
-- 3. Update Apartments Table
-- IMPORTANT: The old household_id was TEXT, we need to handle this
-- ============================================================

-- First, drop the old household_id column if it's text type
-- and recreate it as uuid
DO $$
BEGIN
    -- Check if household_id exists and is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'apartments' 
        AND column_name = 'household_id'
        AND data_type = 'text'
    ) THEN
        -- Drop the old text column (existing data will be lost, but it was just 'default-family' anyway)
        ALTER TABLE public.apartments DROP COLUMN household_id;
    END IF;
END $$;

-- Add household_id as uuid (if it doesn't exist)
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE CASCADE;

-- Add category column (inherited from household but stored for queries)
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'apartment'
    CHECK (category IN ('apartment', 'bride_venue', 'car'));

-- Add metadata JSONB for category-specific fields
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Ensure other required columns exist
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS rooms text;
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS longitude double precision;

-- Recreate index for household queries (drop first if exists with wrong type)
DROP INDEX IF EXISTS idx_apartments_household_id;
CREATE INDEX idx_apartments_household_id ON public.apartments (household_id);
CREATE INDEX IF NOT EXISTS idx_apartments_category ON public.apartments (category);

-- ============================================================
-- 4. Row Level Security (RLS) Policies
-- Ensures users can only access their household's data
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on apartments (including old "Allow full public access")
DROP POLICY IF EXISTS "Allow full public access" ON public.apartments;
DROP POLICY IF EXISTS "Users can view households they belong to" ON public.households;
DROP POLICY IF EXISTS "Users can create households" ON public.households;
DROP POLICY IF EXISTS "Users can update their own household" ON public.households;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view household members" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their household items" ON public.apartments;
DROP POLICY IF EXISTS "Users can insert items to their household" ON public.apartments;
DROP POLICY IF EXISTS "Users can update their household items" ON public.apartments;
DROP POLICY IF EXISTS "Users can delete their household items" ON public.apartments;

-- ── Households Policies ──────────────────────────────────────

-- Users can view households they belong to
CREATE POLICY "Users can view households they belong to" ON public.households
    FOR SELECT USING (
        id = (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Authenticated users can create households
CREATE POLICY "Users can create households" ON public.households
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own household (if they're a member)
CREATE POLICY "Users can update their own household" ON public.households
    FOR UPDATE USING (
        id = (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- ── Profiles Policies ────────────────────────────────────────

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

-- Users can view other members in their household (for reactions display)
CREATE POLICY "Users can view household members" ON public.profiles
    FOR SELECT USING (
        household_id IS NOT NULL 
        AND household_id = (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- ── Apartments/Items Policies ────────────────────────────────

-- Users can view items in their household
CREATE POLICY "Users can view their household items" ON public.apartments
    FOR SELECT USING (
        household_id IS NOT NULL
        AND household_id = (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Users can insert items to their household
CREATE POLICY "Users can insert items to their household" ON public.apartments
    FOR INSERT WITH CHECK (
        household_id IS NOT NULL
        AND household_id = (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Users can update items in their household
CREATE POLICY "Users can update their household items" ON public.apartments
    FOR UPDATE USING (
        household_id IS NOT NULL
        AND household_id = (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Users can delete items in their household
CREATE POLICY "Users can delete their household items" ON public.apartments
    FOR DELETE USING (
        household_id IS NOT NULL
        AND household_id = (SELECT p.household_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- ============================================================
-- 5. Trigger: Auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. Enable Realtime for new tables (ignore errors if already added)
-- ============================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.households;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================================
-- DONE! Verify by running:
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'apartments' AND column_name = 'household_id';
-- 
-- Should return: household_id | uuid

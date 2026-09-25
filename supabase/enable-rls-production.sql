-- ============================================================
-- JustPick — Production RLS Re-Enable Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Re-enables Row Level Security on all application tables.
-- RLS was temporarily disabled during development.
-- Run this ONCE before going to production.
--
-- Prerequisites:
--   1. supabase/migration-v2.0-grouppick.sql must have been run
--   2. supabase/fix-rls-recursion.sql must have been run
--   3. supabase/migration-push-subscriptions.sql must have been run
-- ============================================================

-- ── Step 1: Re-enable RLS on all tables ──────────────────────────────────────

ALTER TABLE public.households         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- activity_log (created in migration-v3.1-activity-log.sql)
-- ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ── Step 2: Re-enable RLS on the households SELECT policy ─────────────────────
-- The SELECT policy was made permissive (WITH CHECK (true)) during dev debugging.
-- Replace it with the correct scoped policy.

DROP POLICY IF EXISTS "Users can view households they belong to" ON public.households;

CREATE POLICY "Users can view households they belong to" ON public.households
    FOR SELECT USING (
        id = public.get_my_household_id()
    );

-- ── Step 3: Ensure all INSERT/UPDATE/DELETE policies are in place ─────────────
-- These should already exist from fix-rls-recursion.sql but we re-assert
-- them defensively to guarantee a complete, correct policy set.

-- Households
DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own household" ON public.households;
CREATE POLICY "Users can update their own household" ON public.households
    FOR UPDATE USING (id = public.get_my_household_id());

-- Profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Allow users to delete their own profile (required for GDPR delete-account)
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (id = auth.uid());

-- Apartments (all scoped to household)
DROP POLICY IF EXISTS "Users can view their household items" ON public.apartments;
CREATE POLICY "Users can view their household items" ON public.apartments
    FOR SELECT USING (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

DROP POLICY IF EXISTS "Users can insert items to their household" ON public.apartments;
CREATE POLICY "Users can insert items to their household" ON public.apartments
    FOR INSERT WITH CHECK (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

DROP POLICY IF EXISTS "Users can update their household items" ON public.apartments;
CREATE POLICY "Users can update their household items" ON public.apartments
    FOR UPDATE USING (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

DROP POLICY IF EXISTS "Users can delete their household items" ON public.apartments;
CREATE POLICY "Users can delete their household items" ON public.apartments
    FOR DELETE USING (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

-- Push subscriptions (users manage only their own rows)
-- Service-role key bypasses RLS for group-wide broadcast reads
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions
    FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can select their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can select their own push subscriptions" ON public.push_subscriptions
    FOR SELECT USING (user_id = auth.uid());

-- ── Step 4: Verify RLS is enabled ────────────────────────────────────────────
-- Run this query after to confirm all tables have RLS on:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Expected: all app tables show rowsecurity = true
-- ============================================================

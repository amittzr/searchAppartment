-- ============================================================
-- Fix RLS Infinite Recursion
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view household members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view households they belong to" ON public.households;
DROP POLICY IF EXISTS "Users can update their own household" ON public.households;
DROP POLICY IF EXISTS "Users can view their household items" ON public.apartments;
DROP POLICY IF EXISTS "Users can insert items to their household" ON public.apartments;
DROP POLICY IF EXISTS "Users can update their household items" ON public.apartments;
DROP POLICY IF EXISTS "Users can delete their household items" ON public.apartments;

-- ============================================================
-- Create a SECURITY DEFINER function to get user's household_id
-- This bypasses RLS and prevents recursion
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_household_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT household_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- Profiles Policies (Fixed - no recursion)
-- ============================================================

-- Users can view their own profile (simple, no subquery needed)
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

-- Users can view other members in their household
-- Uses the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view household members" ON public.profiles
    FOR SELECT USING (
        household_id IS NOT NULL 
        AND household_id = public.get_my_household_id()
    );

-- ============================================================
-- Households Policies (Fixed)
-- ============================================================

-- Users can view households they belong to
CREATE POLICY "Users can view households they belong to" ON public.households
    FOR SELECT USING (
        id = public.get_my_household_id()
    );

-- Authenticated users can create households
CREATE POLICY "Users can create households" ON public.households
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own household
CREATE POLICY "Users can update their own household" ON public.households
    FOR UPDATE USING (
        id = public.get_my_household_id()
    );

-- ============================================================
-- Apartments Policies (Fixed)
-- ============================================================

-- Users can view items in their household
CREATE POLICY "Users can view their household items" ON public.apartments
    FOR SELECT USING (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

-- Users can insert items to their household
CREATE POLICY "Users can insert items to their household" ON public.apartments
    FOR INSERT WITH CHECK (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

-- Users can update items in their household
CREATE POLICY "Users can update their household items" ON public.apartments
    FOR UPDATE USING (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

-- Users can delete items in their household
CREATE POLICY "Users can delete their household items" ON public.apartments
    FOR DELETE USING (
        household_id IS NOT NULL
        AND household_id = public.get_my_household_id()
    );

-- ============================================================
-- Grant execute permission on the function
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_my_household_id() TO authenticated;

-- ============================================================
-- DONE! The recursion should now be fixed.
-- ============================================================

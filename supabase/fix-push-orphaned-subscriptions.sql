-- ============================================================
-- Fix Push Notification Cross-Group Leakage
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Removes orphaned push subscriptions where the group_id no longer
-- matches the user's current household_id.
-- This cleans up any subscriptions created before the subscribe route
-- was fixed to delete-then-insert on every subscribe action.
-- ============================================================

-- Step 1: Show the problem (run this first to confirm affected rows)
-- SELECT ps.id, ps.user_id, ps.group_id, p.household_id
-- FROM public.push_subscriptions ps
-- JOIN public.profiles p ON p.id = ps.user_id
-- WHERE ps.group_id != p.household_id OR p.household_id IS NULL;

-- Step 2: Delete subscriptions whose group_id no longer matches
-- the user's current household. These are the orphaned rows causing
-- cross-group notification leakage.
DELETE FROM public.push_subscriptions ps
WHERE EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = ps.user_id
    AND (p.household_id IS NULL OR p.household_id != ps.group_id)
);

-- Step 3: Ensure each user has at most one subscription per endpoint
-- (handles any duplicates created by the faulty upsert logic)
DELETE FROM public.push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, subscription->>'endpoint') id
  FROM public.push_subscriptions
  ORDER BY user_id, subscription->>'endpoint', created_at DESC
);

-- ============================================================
-- Verify cleanup:
-- SELECT COUNT(*) FROM push_subscriptions;
-- SELECT ps.id, ps.user_id, ps.group_id, p.household_id
-- FROM push_subscriptions ps
-- JOIN profiles p ON p.id = ps.user_id;
-- ============================================================

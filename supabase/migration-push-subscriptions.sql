-- ============================================================
-- GroupPick — Push Subscriptions Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Creates the push_subscriptions table for Web Push Notifications.
-- Each row ties a browser push subscription to a specific user
-- and their active household group.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id     uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- Full PushSubscription JSON (endpoint + keys)
  subscription jsonb       NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- One subscription per user per browser (endpoint is unique per browser)
-- We use a partial unique index on endpoint extracted from the JSONB
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint
  ON public.push_subscriptions ((subscription->>'endpoint'), user_id);

-- Index for fast lookup by group (used when broadcasting)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_group_id
  ON public.push_subscriptions (group_id);

-- Index for fast lookup by user (used when subscribing/unsubscribing)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can select their own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- ── Column to track last reminder sent per item ───────────────────────────────
-- Prevents spamming users with repeated reminders
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz DEFAULT NULL;

-- ============================================================
-- Verify:
-- SELECT * FROM push_subscriptions LIMIT 5;
-- ============================================================

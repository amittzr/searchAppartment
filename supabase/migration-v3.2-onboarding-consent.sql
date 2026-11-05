-- ============================================================
-- Migration v3.2: Terms consent + one-time onboarding guide
--
-- Adds two columns to public.profiles:
--   terms_accepted_at         when the user agreed to Terms & Privacy
--   has_completed_onboarding  whether the welcome guide was finished/dismissed
--
-- Run this in the Supabase SQL Editor BEFORE deploying the app version
-- that reads these columns. The script is safe to run more than once.
-- ============================================================

-- ------------------------------------------------------------
-- 1. terms_accepted_at
--    NULL for users who signed up before consent was collected.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- ------------------------------------------------------------
-- 2. has_completed_onboarding
--    The column is first added with DEFAULT true so that every
--    EXISTING profile is backfilled as "already onboarded" (they must
--    never see the welcome guide). The default is then switched to false
--    so that NEW profiles start with the guide pending.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
    ALTER COLUMN has_completed_onboarding SET DEFAULT false;

-- ------------------------------------------------------------
-- 3. Update the signup trigger
--    Records the consent time using SERVER time (now()) when the signup
--    form sent terms_accepted = true in the user metadata. Using the
--    server clock keeps the audit timestamp independent of the client.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, terms_accepted_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE
            WHEN (NEW.raw_user_meta_data->>'terms_accepted') = 'true' THEN now()
            ELSE NULL
        END
    );
    RETURN NEW;
END;
$$;

-- The trigger itself (on_auth_user_created) already points at this function,
-- so replacing the function body is enough. Recreate it defensively in case
-- it is missing in this environment.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

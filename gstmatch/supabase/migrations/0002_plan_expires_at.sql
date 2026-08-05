-- 0002_plan_expires_at.sql
-- Adds plan-expiry tracking for the manual-renewal subscription model.
-- Run this in the Supabase SQL Editor (it is idempotent — safe to re-run).

-- 1. Track when the current paid period ends.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- 2. Let each authenticated user read their own plan + expiry.
--    Used by the dashboard expiry banner and the upload usage-limit logic.
--    (DROP first so this script is re-runnable.)
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- 3. (Optional) Backfill existing paid users with a 30-day grace period from now.
--    Skip this if you'd rather have them renew immediately.
-- UPDATE public.users
--   SET plan_expires_at = now() + interval '30 days'
--   WHERE plan IN ('starter', 'growth') AND plan_expires_at IS NULL;

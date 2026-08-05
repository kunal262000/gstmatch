-- 0002_plan_expires_at.sql
-- Ensures the `users` table exists with plan-tracking columns, adds plan-expiry
-- tracking, and sets up the Row Level Security policies the app uses.
-- Idempotent — safe to re-run from the Supabase SQL Editor.

-- 1. Create the `users` table if it doesn't exist yet (fresh installs).
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    plan TEXT DEFAULT 'free',
    usage_count INTEGER DEFAULT 0,
    plan_expires_at TIMESTAMPTZ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLS on the `users` table (write path uses the service role, which bypasses RLS).
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Add the plan-expiry column if it isn't there yet (existing installs).
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- 4. Each authenticated user can read their own plan + expiry (dashboard banner & limits).
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- 5. Users can read/insert their own reconciliation results (dashboard history
--    & usage count). Ensures these policies exist if RLS is enabled.
DROP POLICY IF EXISTS "Users see own results" ON public.reconciliation_results;
CREATE POLICY "Users see own results" ON public.reconciliation_results
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own results" ON public.reconciliation_results;
CREATE POLICY "Users insert own results" ON public.reconciliation_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. (Optional) Backfill existing paid users with a 30-day grace period from now.
--    Skip this if you'd rather have them renew immediately.
-- UPDATE public.users
--   SET plan_expires_at = now() + interval '30 days'
--   WHERE plan IN ('starter', 'growth', 'deluxe') AND plan_expires_at IS NULL;


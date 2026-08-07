-- 0003_admin_activity.sql
-- Adds admin support and a lightweight user-activity / audit log for the
-- Admin Dashboard (Tier 2). Idempotent — safe to re-run from the SQL Editor.

-- 1. Flag a user as an admin. Admins can be marked here OR via the ADMIN_EMAILS
--    environment variable (see lib/adminServer.ts). Service role writes bypass RLS.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Activity / audit log. Records signups, uploads, payments and admin actions.
--    `detail` is free-form JSONB so new event types don't require schema changes.
CREATE TABLE IF NOT EXISTS public.user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    email TEXT,
    action TEXT NOT NULL,
    detail JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS: users may record their OWN activity. Reads are performed by the Admin
--    API using the service role (bypasses RLS), so no SELECT policy is exposed.
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own activity" ON public.user_activity;
CREATE POLICY "Users insert own activity" ON public.user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Indexes for the admin log queries.
CREATE INDEX IF NOT EXISTS user_activity_user_id_idx    ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON public.user_activity(created_at DESC);

-- 5. Admins need read access across all users/results/logs. Because the Admin API
--    uses the service role (which bypasses RLS), no additional policies are required
--    for those reads.

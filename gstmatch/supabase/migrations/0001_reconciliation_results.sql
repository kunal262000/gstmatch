-- 0001_reconciliation_results.sql
-- Creates the reconciliation results table that the FastAPI backend (storage/job_store.py)
-- persists results to and retrieves them from, and the Row-Level-Security policies the
-- app uses.
--
-- This table is REQUIRED for reconciliation results to survive across backend restarts /
-- scaled instances. If it's missing, results are kept only in memory and a process restart
-- between save and read produces "Result not found".
--
-- Idempotent — safe to re-run from the Supabase SQL Editor.
--
-- NOTE: 0002_plan_expires_at.sql adds the "read own result" / "insert own result" policies
-- referencing this table, so apply 0001 first (the migrations directory runs in filename order).

-- 1. Create the results table if it doesn't exist yet (fresh installs).
CREATE TABLE IF NOT EXISTS public.reconciliation_results (
    id         TEXT PRIMARY KEY,
    user_id    UUID,
    period     TEXT NOT NULL,
    gstin      TEXT NOT NULL,
    data       JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLS on (the write path uses the service role, which bypasses RLS).
ALTER TABLE public.reconciliation_results ENABLE ROW LEVEL SECURITY;

-- 3. Index for usage counts (free-tier limit) and RLS-filtered queries.
CREATE INDEX IF NOT EXISTS reconciliation_results_user_id_idx
    ON public.reconciliation_results(user_id);
CREATE INDEX IF NOT EXISTS reconciliation_results_created_at_idx
    ON public.reconciliation_results(created_at DESC);

-- 4. Users can read/insert their own results. Kept here so this migration is
--    self-contained even if 0002 is applied after.
DROP POLICY IF EXISTS "Users see own results" ON public.reconciliation_results;
CREATE POLICY "Users see own results" ON public.reconciliation_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own results" ON public.reconciliation_results;
CREATE POLICY "Users insert own results" ON public.reconciliation_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);
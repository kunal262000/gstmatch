-- 0009_summary_reconciliation_results.sql
-- Creates the summary-engine results table (GSTR-3B vs GSTR-1, GSTR-1 vs
-- GSTR-3B, GSTR-9 vs Books, GSTR-9C vs Books) that storage/job_store.py's
-- save_summary()/get_summary()/get_summary_with_owner() persist to.
--
-- Mirrors 0001_reconciliation_results.sql exactly — same shape, same RLS
-- pattern, separate table because the `data` JSONB payload has a different
-- internal shape (SummaryReconciliationResult vs ReconciliationResult).
--
-- REQUIRED before enabling any of the 4 summary-engine reconciliation types
-- in production — without it, those results only survive in memory and a
-- backend restart between save and read produces "Result not found" for
-- them (same behaviour the original table's docstring warns about).
--
-- Idempotent — safe to re-run from the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.summary_reconciliation_results (
    id         TEXT PRIMARY KEY,
    user_id    UUID,
    period     TEXT NOT NULL,
    gstin      TEXT NOT NULL,
    data       JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.summary_reconciliation_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS summary_reconciliation_results_user_id_idx
    ON public.summary_reconciliation_results(user_id);
CREATE INDEX IF NOT EXISTS summary_reconciliation_results_created_at_idx
    ON public.summary_reconciliation_results(created_at DESC);

DROP POLICY IF EXISTS "Users see own summary results" ON public.summary_reconciliation_results;
CREATE POLICY "Users see own summary results" ON public.summary_reconciliation_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own summary results" ON public.summary_reconciliation_results;
CREATE POLICY "Users insert own summary results" ON public.summary_reconciliation_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

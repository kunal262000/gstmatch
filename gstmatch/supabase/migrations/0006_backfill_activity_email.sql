-- 0006_backfill_activity_email.sql
-- Backfills email in user_activity from reconciliation_results + users table.
-- Idempotent — safe to re-run from the Supabase SQL Editor.

-- Update email for activity rows where email is null and action is 'upload'
-- by joining with reconciliation_results to get user_id, then users table for email
UPDATE public.user_activity ua
SET email = u.email
FROM public.reconciliation_results rr
JOIN public.users u ON u.id = rr.user_id
WHERE ua.email IS NULL
  AND ua.action = 'upload'
  AND ua.detail->>'jobId' = rr.id
  AND u.email IS NOT NULL;

-- Verify the backfill
SELECT 
  ua.id,
  ua.action,
  ua.email,
  ua.detail,
  ua.created_at
FROM public.user_activity ua
WHERE ua.action = 'upload'
ORDER BY ua.created_at DESC
LIMIT 50;
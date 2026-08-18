-- 0005_backfill_usage_count.sql
-- Backfills usage_count for all existing users based on reconciliation_results history.
-- Idempotent — safe to re-run from the Supabase SQL Editor.

-- Update usage_count for each user based on their reconciliation history
UPDATE public.users u
SET usage_count = COALESCE((
  SELECT COUNT(*)
  FROM public.reconciliation_results r
  WHERE r.user_id = u.id
), 0);

-- Verify the backfill
SELECT 
  u.id,
  u.email,
  u.usage_count,
  (SELECT COUNT(*) FROM public.reconciliation_results r WHERE r.user_id = u.id) as actual_recons
FROM public.users u
ORDER BY u.created_at DESC;
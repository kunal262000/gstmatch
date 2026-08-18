-- 0008_debug_and_fix_data.sql
-- Debug data inconsistencies and fix usage_count + activity_log
-- Run this in Supabase SQL Editor to see what's happening

-- ============================================================
-- STEP 1: Check current state
-- ============================================================

-- Users table
SELECT 'USERS TABLE' as table_name, count(*) as row_count FROM public.users;
SELECT id, email, plan, usage_count, created_at FROM public.users ORDER BY created_at DESC;

-- Reconciliation results
SELECT 'RECONCILIATION_RESULTS' as table_name, count(*) as row_count FROM public.reconciliation_results;
SELECT id, user_id, period, gstin, created_at FROM public.reconciliation_results ORDER BY created_at DESC LIMIT 20;

-- User activity
SELECT 'USER_ACTIVITY' as table_name, count(*) as row_count FROM public.user_activity;
SELECT id, user_id, email, action, detail, created_at FROM public.user_activity ORDER BY created_at DESC LIMIT 20;

-- ============================================================
-- STEP 2: Check for user_id mismatches
-- ============================================================

-- Reconciliation results with user_ids that don't exist in users table
SELECT 'ORPHAN RECONS' as check_name, r.id, r.user_id 
FROM public.reconciliation_results r
LEFT JOIN public.users u ON u.id = r.user_id
WHERE u.id IS NULL;

-- User activity with user_ids that don't exist in users table
SELECT 'ORPHAN ACTIVITY' as check_name, a.id, a.user_id, a.detail
FROM public.user_activity a
LEFT JOIN public.users u ON u.id = a.user_id
WHERE u.id IS NULL;

-- ============================================================
-- STEP 3: Fix usage_count for ALL users (re-run backfill)
-- ============================================================

UPDATE public.users u
SET usage_count = COALESCE((
  SELECT COUNT(*)
  FROM public.reconciliation_results r
  WHERE r.user_id = u.id
), 0);

-- Verify usage_count fix
SELECT 'USAGE_COUNT AFTER FIX' as check_name, u.id, u.email, u.usage_count,
  (SELECT COUNT(*) FROM public.reconciliation_results r WHERE r.user_id = u.id) as actual_recons
FROM public.users u
ORDER BY u.created_at DESC;

-- ============================================================
-- STEP 4: Fix activity log emails (re-run backfill)
-- ============================================================

UPDATE public.user_activity ua
SET email = u.email
FROM public.reconciliation_results rr
JOIN public.users u ON u.id = rr.user_id
WHERE ua.email IS NULL
  AND ua.action = 'upload'
  AND ua.detail->>'jobId' = rr.id
  AND u.email IS NOT NULL;

-- Also fix activity rows that have user_id but no email (join directly on user_id)
UPDATE public.user_activity ua
SET email = u.email
FROM public.users u
WHERE ua.email IS NULL
  AND ua.user_id = u.id
  AND u.email IS NOT NULL;

-- Verify activity log fix
SELECT 'ACTIVITY AFTER FIX' as check_name, ua.id, ua.user_id, ua.email, ua.action, ua.detail, ua.created_at
FROM public.user_activity ua
WHERE ua.action = 'upload'
ORDER BY ua.created_at DESC
LIMIT 50;

-- ============================================================
-- STEP 5: Insert missing activity logs for reconciliations that don't have them
-- ============================================================

INSERT INTO public.user_activity (user_id, email, action, detail, created_at)
SELECT 
  r.user_id,
  u.email,
  'upload',
  jsonb_build_object(
    'jobId', r.id,
    'period', r.period,
    'gstin', r.gstin
  ),
  r.created_at
FROM public.reconciliation_results r
JOIN public.users u ON u.id = r.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_activity ua 
  WHERE ua.action = 'upload' 
  AND ua.detail->>'jobId' = r.id
)
ON CONFLICT DO NOTHING;

-- Final verification
SELECT 'FINAL USAGE_COUNT' as check_name, u.id, u.email, u.usage_count
FROM public.users u
ORDER BY u.created_at DESC;

SELECT 'FINAL ACTIVITY' as check_name, ua.id, ua.user_id, ua.email, ua.action, ua.detail, ua.created_at
FROM public.user_activity ua
ORDER BY ua.created_at DESC
LIMIT 50;
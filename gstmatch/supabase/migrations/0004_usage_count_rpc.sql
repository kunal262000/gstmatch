-- 0004_usage_count_rpc.sql
-- Adds a helper RPC function to atomically increment usage_count for the admin dashboard.
-- Idempotent — safe to re-run from the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.increment_usage_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.users
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = user_id
  RETURNING usage_count INTO new_count;
  
  RETURN new_count;
END;
$$;

-- Grant execute to authenticated users (they call it via supabase.rpc)
GRANT EXECUTE ON FUNCTION public.increment_usage_count(UUID) TO authenticated;
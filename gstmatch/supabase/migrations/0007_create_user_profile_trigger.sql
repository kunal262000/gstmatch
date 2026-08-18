-- 0007_create_user_profile_trigger.sql
-- Creates a trigger to automatically insert a row into public.users when a new user signs up.
-- Idempotent — safe to re-run from the Supabase SQL Editor.

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan, usage_count, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    0,
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth.users who don't have a profile yet
INSERT INTO public.users (id, email, plan, usage_count, created_at)
SELECT 
  au.id,
  au.email,
  'free',
  0,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL;

-- Verify
SELECT 
  u.id,
  u.email,
  u.plan,
  u.usage_count,
  u.created_at
FROM public.users u
ORDER BY u.created_at DESC;
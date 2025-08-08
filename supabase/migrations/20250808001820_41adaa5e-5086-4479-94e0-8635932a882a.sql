-- PROFILES EMAIL MIGRATION: Fix "request forbidden" errors
-- Add unique constraint on user_id, email column, update trigger function, backfill data

BEGIN;

-- 1) Add unique constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- 2) Add email column if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3) Recreate handle_new_user function with email handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email,'@',1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
    SET name  = EXCLUDED.name,
        email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- 4) Ensure trigger is properly bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Backfill email for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 6) Ensure RLS is enabled and policies are correct
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies (idempotent) - Fixed column name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read own profile' AND schemaname='public' AND tablename='profiles') THEN
    DROP POLICY "read own profile" ON public.profiles;
  END IF;
  CREATE POLICY "read own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'upsert own profile' AND schemaname='public' AND tablename='profiles') THEN
    DROP POLICY "upsert own profile" ON public.profiles;
  END IF;
  CREATE POLICY "upsert own profile"
  ON public.profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
END$$;

-- 7) Add FK constraint for user_preferences if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='user_preferences'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_user_id_fkey'
    ) THEN
      ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

COMMIT;
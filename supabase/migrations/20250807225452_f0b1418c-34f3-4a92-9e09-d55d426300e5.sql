-- Sprint 0: Schema & Auth Debug Fixes (Fixed Version)
-- Fix foreign key constraints and establish canonical user table

-- 1) Ensure profiles table exists and is canonical
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profile access policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2) Fix user_preferences - drop all policies first to avoid type alteration issues
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "upsert_own_prefs" ON public.user_preferences;

-- Drop existing FK constraint
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- Ensure user_id is proper UUID type (it should already be UUID based on the table definition)
-- Only alter if needed - check if it's already UUID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.user_preferences
      ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
  END IF;
END$$;

-- Make user_id NOT NULL
ALTER TABLE public.user_preferences
  ALTER COLUMN user_id SET NOT NULL;

-- Add correct FK pointing to profiles
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3) Auto-provision profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-provisioning
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Re-enable RLS and create proper policies for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5) Backfill profile rows for any existing auth users missing profiles
INSERT INTO public.profiles (id, email, display_name)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email,'@',1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 6) Ensure dev users have profiles (based on the dev user IDs from code)
INSERT INTO public.profiles (id, email, display_name) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::UUID, 'aisha@demo.com', 'Aisha Khan'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::UUID, 'mateo@demo.com', 'Mateo Silva'),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::UUID, 'jade@demo.com', 'Jade Chen')
ON CONFLICT (id) DO NOTHING;
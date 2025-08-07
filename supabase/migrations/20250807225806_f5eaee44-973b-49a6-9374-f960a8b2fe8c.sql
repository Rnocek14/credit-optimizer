-- Sprint 0: Schema & Auth Debug Fixes (Adapted to Existing Schema)
-- Fix foreign key constraints using the existing profiles table structure

-- 1) The profiles table already exists, so just ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profile access policies for existing table structure
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

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

-- Make user_id NOT NULL (it should already be UUID based on existing schema)
ALTER TABLE public.user_preferences
  ALTER COLUMN user_id SET NOT NULL;

-- Add correct FK pointing to profiles.user_id (not profiles.id since profiles uses user_id)
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3) Auto-provision profile on signup (adapted for existing schema)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email,'@',1))
  )
  ON CONFLICT (user_id) DO NOTHING;
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
INSERT INTO public.profiles (user_id, name)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email,'@',1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 6) Ensure dev users have profiles (using existing schema structure)
INSERT INTO public.profiles (user_id, name) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::UUID, 'Aisha Khan'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::UUID, 'Mateo Silva'),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::UUID, 'Jade Chen')
ON CONFLICT (user_id) DO NOTHING;
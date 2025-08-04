-- Add LinkedIn OAuth support and data import tracking
-- Enhance profiles table with LinkedIn data and import tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_id text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS import_source text DEFAULT 'manual';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_import_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_completeness_score numeric DEFAULT 0.0;

-- Create data imports tracking table
CREATE TABLE IF NOT EXISTS public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  import_type text NOT NULL, -- 'linkedin', 'resume', 'transcript', 'manual'
  import_source text NOT NULL, -- source identifier
  raw_data jsonb NOT NULL DEFAULT '{}',
  processed_data jsonb NOT NULL DEFAULT '{}',
  import_status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  confidence_score numeric DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on data_imports
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

-- Create policies for data_imports
CREATE POLICY "Users can view their own imports" ON public.data_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own imports" ON public.data_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all imports" ON public.data_imports
  FOR ALL USING (true);

-- Create skill extractions table for AI-generated skills
CREATE TABLE IF NOT EXISTS public.skill_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  import_id uuid REFERENCES public.data_imports ON DELETE CASCADE,
  skill_name text NOT NULL,
  skill_category text,
  confidence_score numeric NOT NULL DEFAULT 0.0,
  extraction_source text NOT NULL, -- 'linkedin', 'resume', 'transcript'
  context_snippet text, -- relevant text that led to skill extraction
  validated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on skill_extractions
ALTER TABLE public.skill_extractions ENABLE ROW LEVEL SECURITY;

-- Create policies for skill_extractions
CREATE POLICY "Users can view their own skill extractions" ON public.skill_extractions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill extractions" ON public.skill_extractions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all skill extractions" ON public.skill_extractions
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_imports_user_id ON public.data_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_imports_type ON public.data_imports(import_type);
CREATE INDEX IF NOT EXISTS idx_skill_extractions_user_id ON public.skill_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_extractions_import_id ON public.skill_extractions(import_id);
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON public.profiles(linkedin_id);

-- Create function to calculate data completeness score
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(profile_row public.profiles)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  score numeric := 0;
  total_fields numeric := 10;
BEGIN
  -- Basic fields (weight: 1 each)
  IF profile_row.name IS NOT NULL AND profile_row.name != '' THEN score := score + 1; END IF;
  IF profile_row.email IS NOT NULL AND profile_row.email != '' THEN score := score + 1; END IF;
  IF profile_row.headline IS NOT NULL AND profile_row.headline != '' THEN score := score + 1; END IF;
  IF profile_row.location IS NOT NULL AND profile_row.location != '' THEN score := score + 1; END IF;
  IF profile_row.industry IS NOT NULL AND profile_row.industry != '' THEN score := score + 1; END IF;
  IF profile_row.summary IS NOT NULL AND profile_row.summary != '' THEN score := score + 1; END IF;
  IF profile_row.linkedin_url IS NOT NULL AND profile_row.linkedin_url != '' THEN score := score + 1; END IF;
  IF profile_row.avatar_url IS NOT NULL AND profile_row.avatar_url != '' THEN score := score + 1; END IF;
  IF profile_row.bio IS NOT NULL AND profile_row.bio != '' THEN score := score + 1; END IF;
  IF profile_row.current_role IS NOT NULL AND profile_row.current_role != '' THEN score := score + 1; END IF;

  RETURN ROUND((score / total_fields) * 100, 1);
END;
$$;

-- Create trigger to auto-update completeness score
CREATE OR REPLACE FUNCTION public.update_profile_completeness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.data_completeness_score := public.calculate_profile_completeness(NEW);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profile_completeness_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_completeness();
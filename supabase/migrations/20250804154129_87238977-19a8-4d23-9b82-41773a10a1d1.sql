-- Fix security warnings by setting proper search_path for functions

-- Drop and recreate calculate_profile_completeness with proper search_path
DROP FUNCTION IF EXISTS public.calculate_profile_completeness(public.profiles);

CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(profile_row public.profiles)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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

-- Drop and recreate update_profile_completeness with proper search_path
DROP FUNCTION IF EXISTS public.update_profile_completeness();

CREATE OR REPLACE FUNCTION public.update_profile_completeness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.data_completeness_score := public.calculate_profile_completeness(NEW);
  RETURN NEW;
END;
$$;
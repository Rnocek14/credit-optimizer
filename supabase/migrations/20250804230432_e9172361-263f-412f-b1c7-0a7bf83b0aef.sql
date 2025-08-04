-- Fix the calculate_profile_completeness function to match actual table structure
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(profile_row profiles)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  score numeric := 0;
  total_fields numeric := 8;
BEGIN
  -- Basic fields (weight: 1 each) - using actual columns from profiles table
  IF profile_row.name IS NOT NULL AND profile_row.name != '' THEN score := score + 1; END IF;
  IF profile_row.headline IS NOT NULL AND profile_row.headline != '' THEN score := score + 1; END IF;
  IF profile_row.location IS NOT NULL AND profile_row.location != '' THEN score := score + 1; END IF;
  IF profile_row.industry IS NOT NULL AND profile_row.industry != '' THEN score := score + 1; END IF;
  IF profile_row.summary IS NOT NULL AND profile_row.summary != '' THEN score := score + 1; END IF;
  IF profile_row.linkedin_url IS NOT NULL AND profile_row.linkedin_url != '' THEN score := score + 1; END IF;
  IF profile_row.role_title IS NOT NULL AND profile_row.role_title != '' THEN score := score + 1; END IF;
  IF profile_row.experience_level IS NOT NULL AND profile_row.experience_level != '' THEN score := score + 1; END IF;

  RETURN ROUND((score / total_fields) * 100, 1);
END;
$$;
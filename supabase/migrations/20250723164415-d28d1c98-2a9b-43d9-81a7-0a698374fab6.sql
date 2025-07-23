-- Fix security issue: Add search_path to function
CREATE OR REPLACE FUNCTION refresh_career_steps_with_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- No operation needed for regular views
  RETURN;
END;
$$;
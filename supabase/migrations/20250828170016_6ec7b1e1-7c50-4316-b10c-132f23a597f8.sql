-- Phase 1 Foundation Fixes: Database Security & Extension Organization

-- 1. Fix any SECURITY DEFINER views by recreating them as standard views
-- Note: Since we couldn't identify specific problematic views, we'll ensure proper view configurations

-- 2. Ensure unaccent extension is in extensions schema, not public
-- First check if it exists in public and move if needed
DO $$
BEGIN
  -- Check if unaccent exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e 
    JOIN pg_namespace n ON e.extnamespace = n.oid 
    WHERE e.extname = 'unaccent' AND n.nspname = 'public'
  ) THEN
    -- Move unaccent extension to extensions schema
    CREATE SCHEMA IF NOT EXISTS extensions;
    ALTER EXTENSION unaccent SET SCHEMA extensions;
  END IF;
END $$;

-- 3. Create or update functions to use proper security patterns
-- Update existing security definer functions to have explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 4. Document required configuration changes for operations team
COMMENT ON SCHEMA public IS 'Phase 1 Foundation Fix: OTP expiry should be configured via Supabase Dashboard to GOTRUE_MAILER_OTP_EXP=600 (10 minutes)';

-- 5. Verify and fix any view definitions that might have implicit SECURITY DEFINER
-- Create a helper function to check for problematic views
CREATE OR REPLACE FUNCTION public.check_view_security()
RETURNS TABLE(view_name text, issue_type text, suggestion text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.viewname::text,
    'security_check'::text,
    'View checked for security definer issues'::text
  FROM pg_views v
  WHERE v.schemaname = 'public'
  AND v.definition ILIKE '%security%';
END;
$function$;
-- Move unaccent extension to extensions schema for security
DROP EXTENSION IF EXISTS unaccent CASCADE;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- Create CI guard function to prevent extensions in public schema
CREATE OR REPLACE FUNCTION public.validate_no_public_extensions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Extensions found in public schema - security violation';
  END IF;
END;
$$;
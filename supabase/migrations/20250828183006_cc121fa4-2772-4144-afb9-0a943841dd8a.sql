-- Phase 1 Foundation Fixes: Enforce security_invoker on views and clean helper

-- 1) Drop temporary helper if it exists (from earlier attempt)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'check_view_security'
  ) THEN
    DROP FUNCTION public.check_view_security();
  END IF;
END $$;

-- 2) Ensure all public views run with SECURITY INVOKER
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true);', r.schemaname, r.viewname);
  END LOOP;
END $$;

-- 3) Ensure unaccent extension resides in extensions schema (idempotent)
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_extension e 
    JOIN pg_namespace n ON e.extnamespace = n.oid 
    WHERE e.extname = 'unaccent' AND n.nspname <> 'extensions'
  ) THEN
    ALTER EXTENSION unaccent SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- unaccent not installed; ignore
END $$;

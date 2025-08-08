
-- SECURITY FIX MIGRATION: Resolve all 5 security warnings
-- 1. Fix Function Search Path Mutable (2 instances)
-- 2. Move Extension from Public Schema
BEGIN;

-- Fix 1: Update update_study_groups_updated_at with proper search_path
CREATE OR REPLACE FUNCTION public.update_study_groups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 2: Update update_user_preferences_updated_at with proper search_path
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 3: Move pg_net extension from public to extensions schema
-- Note: This requires recreating the extension in the correct schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Fix 4: Revoke CREATE privileges on public schema to prevent future extensions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
-- Grant it back only to authenticated users and service role as needed
GRANT CREATE ON SCHEMA public TO authenticated;
GRANT CREATE ON SCHEMA public TO service_role;

COMMIT;

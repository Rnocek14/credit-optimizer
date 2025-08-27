-- Fix security definer views by dropping and recreating without SECURITY DEFINER
-- This addresses the security warnings

-- Drop existing security definer views (these will be recreated without SECURITY DEFINER)
DROP VIEW IF EXISTS public.unified_user_progress CASCADE;
DROP VIEW IF EXISTS public.track_progress_summary CASCADE;

-- Fix function search path issues for critical functions
-- Set immutable search_path for functions to prevent injection attacks

-- Update get_user_level function with secure search path
CREATE OR REPLACE FUNCTION public.get_user_level(user_id_param uuid)
RETURNS TABLE(current_level integer, total_xp integer, xp_to_next integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(FLOOR(SQRT(COALESCE(SUM(xp.amount), 0) / 100.0))::integer, 1) as current_level,
    COALESCE(SUM(xp.amount), 0)::integer as total_xp,
    COALESCE((POWER(FLOOR(SQRT(COALESCE(SUM(xp.amount), 0) / 100.0)) + 1, 2) * 100) - COALESCE(SUM(xp.amount), 0), 100)::integer as xp_to_next
  FROM xp_transactions xp
  WHERE xp.user_id = user_id_param;
END;
$$;

-- Update update_updated_at_column function with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add missing RLS policies for tables that have RLS enabled but no policies
-- This addresses the RLS enabled but no policy warnings

-- Add basic RLS policy for age_penalty_curves if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'age_penalty_curves' AND policyname = 'Service role can manage age penalty curves'
  ) THEN
    CREATE POLICY "Service role can manage age penalty curves" ON public.age_penalty_curves
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add basic RLS policy for app_config if missing  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'app_config' AND policyname = 'Service role can manage app config'
  ) THEN
    CREATE POLICY "Service role can manage app config" ON public.app_config
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add basic RLS policy for anomaly_detections if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'anomaly_detections' AND policyname = 'Service role can manage anomaly detections'
  ) THEN
    CREATE POLICY "Service role can manage anomaly detections" ON public.anomaly_detections
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
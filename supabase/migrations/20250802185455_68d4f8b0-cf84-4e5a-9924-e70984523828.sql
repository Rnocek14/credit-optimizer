-- Fix security warnings for function search paths
-- Update functions to have proper search_path settings

ALTER FUNCTION public.calculate_system_health_score() SET search_path TO 'public';

ALTER FUNCTION public.suggest_badges_for_user(uuid) SET search_path TO 'public', 'auth';

-- These are the only two functions that were created without search_path and are user-defined
-- The other warnings are for existing system functions that we should not modify
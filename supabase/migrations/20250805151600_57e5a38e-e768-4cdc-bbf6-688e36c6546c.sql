-- Fix get_user_role function to check profiles table as fallback
-- This allows dev users to work without being in auth.users

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- First check user_roles table
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1),
    -- Fallback to profiles table for dev users
    (SELECT role::app_role FROM public.profiles WHERE user_id = user_uuid LIMIT 1),
    -- Default to user role
    'user'::app_role
  );
$function$;
-- Fix database function search paths for security hardening
-- Update functions that don't have explicit search_path set

-- Update generate_certificate_number function
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cert_number TEXT;
  year_prefix TEXT;
BEGIN
  year_prefix := EXTRACT(YEAR FROM now())::TEXT;
  
  -- Generate format: MAYA-YYYY-XXXXXX (where X is random alphanumeric)
  cert_number := 'MAYA-' || year_prefix || '-' || 
    UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM now())::TEXT),
        1, 6
      )
    );
  
  RETURN cert_number;
END;
$function$;

-- Update generate_verification_code function
CREATE OR REPLACE FUNCTION public.generate_verification_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate 12-character alphanumeric verification code
  RETURN UPPER(
    SUBSTRING(
      MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM now())::TEXT || RANDOM()::TEXT),
      1, 12
    )
  );
END;
$function$;

-- Update log_role_change function
CREATE OR REPLACE FUNCTION public.log_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.role_audit_log (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, new_role, changed_by)
    VALUES (NEW.user_id, NEW.role, auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update update_goal_updated_at function
CREATE OR REPLACE FUNCTION public.update_goal_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update update_user_xp_last_updated function
CREATE OR REPLACE FUNCTION public.update_user_xp_last_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$function$;

-- Update update_career_graph_nodes_updated_at function
CREATE OR REPLACE FUNCTION public.update_career_graph_nodes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update update_user_market_preferences_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_market_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update update_pattern_recognition_updated_at function
CREATE OR REPLACE FUNCTION public.update_pattern_recognition_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
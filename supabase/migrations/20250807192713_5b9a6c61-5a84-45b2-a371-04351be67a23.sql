-- Phase 7: Critical Security Hardening
-- This migration addresses critical security vulnerabilities identified in the security audit

-- 1. Fix Security Definer Functions - Add proper search_path protection
CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, check_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = check_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
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

CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'
  );
$function$;

-- 2. Harden RLS Policies - Remove overly permissive service role policies and add proper user restrictions

-- Drop and recreate overly permissive policies for user_trust_metrics
DROP POLICY IF EXISTS "Service role can manage all user trust metrics" ON public.user_trust_metrics;

-- Add secure policies for user_trust_metrics
CREATE POLICY "Users can view their own trust metrics"
ON public.user_trust_metrics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage trust metrics"
ON public.user_trust_metrics
FOR ALL
USING (
  -- Only allow system functions to manage trust metrics
  auth.uid() IS NULL OR 
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Secure feedback_intelligence_insights
DROP POLICY IF EXISTS "Service role can manage feedback intelligence insights" ON public.feedback_intelligence_insights;

CREATE POLICY "Users can view their own feedback insights"
ON public.feedback_intelligence_insights
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage feedback insights"
ON public.feedback_intelligence_insights
FOR ALL
USING (
  auth.uid() IS NULL OR 
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- 3. Audit and secure other sensitive tables
-- Ensure maya_decisions are properly secured
DROP POLICY IF EXISTS "Service role can manage all Maya decisions" ON public.maya_decisions;

CREATE POLICY "Users can view their own Maya decisions"
ON public.maya_decisions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage Maya decisions"
ON public.maya_decisions
FOR INSERT
WITH CHECK (auth.uid() = user_id OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "System can update Maya decisions"
ON public.maya_decisions
FOR UPDATE
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- 4. Add security audit logging table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  action_details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can access audit logs
CREATE POLICY "Admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- 5. Create security audit function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_action_type text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_action_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action_type, resource_type, resource_id, 
    action_details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_action_type, p_resource_type, p_resource_id,
    p_action_details, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$function$;

-- 6. Add role change audit trigger
CREATE OR REPLACE FUNCTION public.log_role_change_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    PERFORM public.log_security_event(
      NEW.user_id,
      'role_change',
      'user_roles',
      NEW.id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid()
      )
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      NEW.user_id,
      'role_assigned',
      'user_roles', 
      NEW.id,
      jsonb_build_object(
        'role', NEW.role,
        'assigned_by', auth.uid()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Apply audit trigger to user_roles
DROP TRIGGER IF EXISTS user_roles_audit_trigger ON public.user_roles;
CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change_audit();
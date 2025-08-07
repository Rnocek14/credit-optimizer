-- Phase 7: Security Hardening - Database Functions Only
-- Fix Security Definer Functions with proper search_path protection

CREATE OR REPLACE FUNCTION public.calculate_system_health_score()
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH latest_metrics AS (
    SELECT DISTINCT ON (metric_name) 
      metric_name, 
      metric_value, 
      target_value,
      CASE 
        WHEN target_value > 0 THEN (metric_value / target_value) * 100
        ELSE metric_value 
      END as performance_ratio
    FROM public.system_performance_metrics
    WHERE recorded_at >= NOW() - INTERVAL '1 hour'
    ORDER BY metric_name, recorded_at DESC
  ),
  weighted_scores AS (
    SELECT 
      metric_name,
      CASE 
        WHEN metric_name = 'overall_health_score' THEN performance_ratio * 0.3
        WHEN metric_name = 'maya_response_time' THEN 
          CASE WHEN performance_ratio <= 100 THEN 100 ELSE (200 - performance_ratio) END * 0.2
        WHEN metric_name = 'automation_success_rate' THEN performance_ratio * 0.2
        WHEN metric_name = 'uptime_percentage' THEN performance_ratio * 0.15
        WHEN metric_name = 'vulnerability_score' THEN 
          CASE WHEN metric_value <= target_value THEN 100 ELSE 60 END * 0.1
        ELSE performance_ratio * 0.05
      END as weighted_score
    FROM latest_metrics
  )
  SELECT ROUND(COALESCE(SUM(weighted_score), 85), 1)
  FROM weighted_scores;
$function$;

CREATE OR REPLACE FUNCTION public.capture_phase6_baseline(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  baseline_id UUID;
  system_health NUMERIC;
  baseline_data JSONB;
BEGIN
  -- Calculate current system health
  SELECT calculate_system_health_score() INTO system_health;
  
  -- Build comprehensive baseline data
  SELECT jsonb_build_object(
    'performance_metrics', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'metric_name', metric_name,
          'metric_value', metric_value,
          'target_value', target_value,
          'recorded_at', recorded_at
        )
      )
      FROM system_performance_metrics
      WHERE recorded_at >= now() - interval '24 hours'
    ),
    'autonomous_workflows', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'status', status,
          'progress_percentage', progress_percentage,
          'workflow_type', workflow_type,
          'priority', priority
        )
      )
      FROM autonomous_workflows
      WHERE user_id = target_user_id
    ),
    'maya_decisions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'decision_type', decision_type,
          'confidence_score', confidence_score,
          'decision_context', decision_context,
          'created_at', created_at
        )
      )
      FROM maya_decisions
      WHERE user_id = target_user_id
      AND created_at >= now() - interval '7 days'
    ),
    'monitoring_alerts', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'alert_type', alert_type,
          'severity', severity,
          'status', status,
          'category', category
        )
      )
      FROM career_monitoring_alerts
      WHERE user_id = target_user_id
      AND status = 'active'
    ),
    'system_timestamp', now(),
    'system_health_score', system_health
  ) INTO baseline_data;

  -- Insert baseline snapshot
  INSERT INTO public.phase6_baseline_snapshots (
    user_id,
    snapshot_type,
    baseline_data,
    system_health_score,
    metadata
  ) VALUES (
    target_user_id,
    'enterprise_baseline',
    baseline_data,
    system_health,
    jsonb_build_object(
      'phase', 'Phase 6',
      'environment', 'production',
      'locked_by', 'system',
      'enterprise_ready', true
    )
  ) RETURNING id INTO baseline_id;

  RETURN baseline_id;
END;
$function$;

-- Add security audit logging table
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
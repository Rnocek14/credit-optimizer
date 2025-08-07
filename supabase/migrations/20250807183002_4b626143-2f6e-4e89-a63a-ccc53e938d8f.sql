-- Fix capture_phase6_baseline function to use correct column name
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
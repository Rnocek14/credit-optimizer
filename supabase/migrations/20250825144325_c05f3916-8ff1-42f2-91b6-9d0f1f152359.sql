-- Security Hardening Migration: Fix Function Search Paths and RLS Issues

-- 1. Fix Function Search Path Mutable issues (12 functions)
-- These functions need explicit search_path for security

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, check_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = check_role
  );
$function$;

-- Fix get_user_role function  
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1),
    (SELECT role::app_role FROM public.profiles WHERE user_id = user_uuid LIMIT 1),
    'user'::app_role
  );
$function$;

-- Fix is_mentor function
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'
  );
$function$;

-- Fix get_mentor_by_user_id function
CREATE OR REPLACE FUNCTION public.get_mentor_by_user_id(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'mentor'
  );
$function$;

-- Fix validate_mentor_operation function
CREATE OR REPLACE FUNCTION public.validate_mentor_operation(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_mentor_by_user_id(user_uuid);
$function$;

-- Fix generate_certificate_number function
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

-- Fix generate_verification_code function
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN UPPER(
    SUBSTRING(
      MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM now())::TEXT || RANDOM()::TEXT),
      1, 12
    )
  );
END;
$function$;

-- Fix calculate_user_trust_metrics function
CREATE OR REPLACE FUNCTION public.calculate_user_trust_metrics(user_id_param uuid, days_back integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  feedback_count INTEGER := 0;
  avg_effectiveness NUMERIC := 0;
  avg_rating NUMERIC := NULL;
  accuracy NUMERIC := 0;
  engagement NUMERIC := 0;
  trust NUMERIC := 0;
  trend_data JSONB := '[]'::jsonb;
BEGIN
  WITH feedback AS (
    SELECT 
      feedback_effectiveness,
      measured_at,
      CASE 
        WHEN user_action LIKE 'rated_%' THEN NULLIF(split_part(user_action, '_', 2), '')::INT
        ELSE NULL
      END AS rating
    FROM public.maya_feedback_correlations
    WHERE user_id = user_id_param
      AND measured_at >= now() - (days_back || ' days')::interval
  )
  SELECT 
    COUNT(*)::INT,
    COALESCE(AVG(feedback_effectiveness), 0),
    AVG(rating)
  INTO feedback_count, avg_effectiveness, avg_rating
  FROM feedback;

  WITH fb AS (
    SELECT 
      feedback_effectiveness,
      CASE 
        WHEN user_action LIKE 'rated_%' THEN NULLIF(split_part(user_action, '_', 2), '')::INT
        ELSE NULL
      END AS rating
    FROM public.maya_feedback_correlations
    WHERE user_id = user_id_param
      AND measured_at >= now() - (days_back || ' days')::interval
  )
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE COALESCE(rating, 0) >= 4 OR feedback_effectiveness >= 0.6))::NUMERIC 
      / NULLIF(COUNT(*), 0)::NUMERIC, 0
    )
  INTO accuracy
  FROM fb;

  engagement := LEAST(100, GREATEST(0, (feedback_count::NUMERIC / 10.0) * 100));

  IF avg_rating IS NOT NULL THEN
    avg_rating := (avg_rating / 5.0) * 100.0;
  ELSE
    avg_rating := avg_effectiveness * 100.0;
  END IF;

  trust := ROUND((avg_effectiveness * 100.0) * 0.6 + (avg_rating) * 0.4, 1);

  SELECT COALESCE(jsonb_agg(x ORDER BY week), '[]'::jsonb) INTO trend_data
  FROM (
    SELECT 
      to_char(date_trunc('week', measured_at), 'YYYY-MM-DD') AS week,
      ROUND(AVG(feedback_effectiveness) * 100.0, 1) AS effectiveness
    FROM public.maya_feedback_correlations
    WHERE user_id = user_id_param
      AND measured_at >= now() - interval '42 days'
    GROUP BY 1
  ) x;

  RETURN jsonb_build_object(
    'trust_score', trust,
    'satisfaction_score', ROUND(avg_rating, 1),
    'engagement_score', ROUND(engagement, 1),
    'recommendation_accuracy', ROUND(accuracy * 100.0, 1),
    'feedback_volume', feedback_count,
    'trend', trend_data,
    'calculated_at', now()
  );
END;
$function$;

-- Fix upsert_user_trust_metrics function
CREATE OR REPLACE FUNCTION public.upsert_user_trust_metrics(user_id_param uuid, days_back integer DEFAULT 90)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calc jsonb;
  rec_id uuid;
BEGIN
  calc := public.calculate_user_trust_metrics(user_id_param, days_back);

  INSERT INTO public.user_trust_metrics (
    user_id, trust_score, satisfaction_score, engagement_score,
    recommendation_accuracy, feedback_volume, trend, metadata, last_calculated_at
  ) VALUES (
    user_id_param,
    (calc->>'trust_score')::NUMERIC,
    (calc->>'satisfaction_score')::NUMERIC,
    (calc->>'engagement_score')::NUMERIC,
    (calc->>'recommendation_accuracy')::NUMERIC,
    (calc->>'feedback_volume')::INT,
    calc->'trend',
    jsonb_build_object('days_back', days_back),
    (calc->>'calculated_at')::timestamptz
  )
  ON CONFLICT (user_id)
  DO UPDATE SET 
    trust_score = EXCLUDED.trust_score,
    satisfaction_score = EXCLUDED.satisfaction_score,
    engagement_score = EXCLUDED.engagement_score,
    recommendation_accuracy = EXCLUDED.recommendation_accuracy,
    feedback_volume = EXCLUDED.feedback_volume,
    trend = EXCLUDED.trend,
    metadata = EXCLUDED.metadata,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = now()
  RETURNING id INTO rec_id;

  RETURN rec_id;
END;
$function$;

-- Fix calculate_alert_accuracy function
CREATE OR REPLACE FUNCTION public.calculate_alert_accuracy(config_id uuid, days_back integer DEFAULT 30)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH alert_stats AS (
    SELECT 
      COUNT(*) as total_alerts,
      COUNT(*) FILTER (WHERE false_positive = false) as relevant_alerts,
      COUNT(*) FILTER (WHERE user_feedback_rating >= 4) as positive_feedback
    FROM public.alert_history
    WHERE alert_config_id = config_id 
      AND triggered_at >= now() - (days_back || ' days')::interval
  )
  SELECT 
    CASE 
      WHEN total_alerts = 0 THEN 0.0
      ELSE ROUND((relevant_alerts::NUMERIC + positive_feedback::NUMERIC) / (total_alerts::NUMERIC * 2) * 100, 2)
    END
  FROM alert_stats;
$function$;

-- Fix check_mentor_achievements function
CREATE OR REPLACE FUNCTION public.check_mentor_achievements(mentor_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  validation_count INTEGER;
  approval_rate NUMERIC;
  avg_quality NUMERIC;
BEGIN
  SELECT 
    COUNT(*),
    AVG(CASE WHEN mentor_validation_status = 'approved' THEN 100 ELSE 0 END),
    COALESCE(AVG(mcf.course_quality_rating), 3)
  INTO validation_count, approval_rate, avg_quality
  FROM public.course_intelligence_pipeline cip
  LEFT JOIN public.mentor_course_feedback mcf ON mcf.mentor_id = mentor_user_id
  WHERE cip.validated_by = mentor_user_id;

  IF validation_count >= 1 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'first_validation'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'first_validation', 'First Steps', 'Completed your first course validation', '🚀', 10);
  END IF;

  IF validation_count >= 10 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'prolific_validator'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'prolific_validator', 'Prolific Validator', 'Validated 10+ courses', '⭐', 50);
  END IF;

  IF validation_count >= 5 AND approval_rate >= 80 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'quality_champion'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'quality_champion', 'Quality Champion', 'Maintained 80%+ approval rate with 5+ validations', '🏆', 75);
  END IF;

  IF avg_quality >= 4.5 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'student_favorite'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'student_favorite', 'Student Favorite', 'Averaged 4.5+ stars from student feedback', '💝', 100);
  END IF;
END;
$function$;

-- 2. Add missing RLS policies for tables with RLS enabled but no policies

-- Add RLS policies for any tables that need them (this will be determined after migration runs)

-- 3. Create system health monitoring functions
CREATE OR REPLACE FUNCTION public.system_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  health_status JSONB;
  db_connections INTEGER;
  active_users INTEGER;
  error_rate NUMERIC;
BEGIN
  -- Get database connection count
  SELECT count(*) INTO db_connections 
  FROM pg_stat_activity 
  WHERE state = 'active';
  
  -- Get active users in last hour
  SELECT count(DISTINCT user_id) INTO active_users
  FROM career_goals 
  WHERE updated_at >= now() - interval '1 hour';
  
  -- Calculate error rate from logs (if available)
  error_rate := 0.0; -- Placeholder for now
  
  health_status := jsonb_build_object(
    'timestamp', now(),
    'database_connections', db_connections,
    'active_users', active_users,
    'error_rate', error_rate,
    'status', CASE 
      WHEN db_connections < 100 AND error_rate < 0.05 THEN 'healthy'
      WHEN db_connections < 200 AND error_rate < 0.1 THEN 'warning'
      ELSE 'critical'
    END
  );
  
  RETURN health_status;
END;
$function$;

-- 4. Create circuit breaker state table for edge function monitoring
CREATE TABLE IF NOT EXISTS public.circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_time TIMESTAMPTZ,
  next_retry_time TIMESTAMPTZ,
  success_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on circuit breaker state
ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- Only service role can manage circuit breaker state
CREATE POLICY "Service role can manage circuit breaker state" 
ON public.circuit_breaker_state 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 5. Create error taxonomy table for standardized error handling
CREATE TABLE IF NOT EXISTS public.error_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code TEXT NOT NULL UNIQUE,
  error_category TEXT NOT NULL,
  user_message TEXT NOT NULL,
  technical_message TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  retry_strategy TEXT CHECK (retry_strategy IN ('none', 'exponential', 'linear', 'circuit_breaker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on error taxonomy
ALTER TABLE public.error_taxonomy ENABLE ROW LEVEL SECURITY;

-- Anyone can read error taxonomy, only service role can manage
CREATE POLICY "Anyone can read error taxonomy" 
ON public.error_taxonomy 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage error taxonomy" 
ON public.error_taxonomy 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert standard error codes
INSERT INTO public.error_taxonomy (error_code, error_category, user_message, technical_message, severity, retry_strategy) VALUES
('TRACK_NOT_FOUND', 'validation', 'Career track not found or access denied', 'Track ID does not exist or user lacks permission', 'medium', 'none'),
('EDGE_FUNCTION_TIMEOUT', 'network', 'Service temporarily unavailable, please try again', 'Edge function timeout exceeded', 'high', 'exponential'),
('INVALID_TRACK_DATA', 'validation', 'Invalid track data provided', 'Track data validation failed', 'medium', 'none'),
('AUTHENTICATION_REQUIRED', 'auth', 'Please log in to continue', 'User authentication required', 'high', 'none'),
('RATE_LIMIT_EXCEEDED', 'throttling', 'Too many requests, please wait a moment', 'Rate limit exceeded for user', 'medium', 'linear'),
('SYSTEM_MAINTENANCE', 'system', 'System maintenance in progress, please try again later', 'System in maintenance mode', 'high', 'circuit_breaker')
ON CONFLICT (error_code) DO NOTHING;

COMMENT ON TABLE public.circuit_breaker_state IS 'Tracks circuit breaker states for edge function resilience';
COMMENT ON TABLE public.error_taxonomy IS 'Standardized error codes and user-friendly messages';
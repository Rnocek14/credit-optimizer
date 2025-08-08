-- SECURITY: Lock dev user session functions for admin-only access
-- Add admin role checks to dev user session management functions

CREATE OR REPLACE FUNCTION public.dev_user_session_start(
  dev_user_id UUID,
  course_id_param UUID,
  session_type_param TEXT DEFAULT 'learning'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_id UUID;
  is_valid_dev_user BOOLEAN := false;
  current_user_role app_role;
BEGIN
  -- SECURITY: Check if current user has admin role for dev functions
  SELECT public.get_user_role(auth.uid()) INTO current_user_role;
  
  IF current_user_role != 'admin' AND NOT (
    dev_user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,  -- Aisha Khan
      '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,  -- Mateo Silva
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid   -- Jade Chen
    )
  ) THEN
    RAISE EXCEPTION 'SECURITY: Admin role required for dev user session functions';
  END IF;
  
  -- Check if this is a known dev user
  IF dev_user_id IN (
    '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,  -- Aisha Khan
    '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,  -- Mateo Silva
    '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid   -- Jade Chen
  ) THEN
    is_valid_dev_user := true;
  END IF;
  
  -- Only allow authenticated users or valid dev users
  IF auth.uid() IS NULL AND NOT is_valid_dev_user THEN
    RAISE EXCEPTION 'Insufficient permissions to start session';
  END IF;
  
  IF auth.uid() IS NOT NULL AND auth.uid() != dev_user_id THEN
    RAISE EXCEPTION 'Insufficient permissions to start session';
  END IF;
  
  -- Insert learning session with correct column names
  INSERT INTO public.learning_engagement_sessions (
    user_id,
    course_id,
    session_type,
    started_at,
    activity_data,
    engagement_score
  ) VALUES (
    dev_user_id,
    course_id_param,
    session_type_param,
    now(),
    jsonb_build_object('session_start', now(), 'node_title', 'React Development'),
    0.5
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dev_user_session_end(
  dev_user_id UUID,
  session_id_param UUID,
  session_metrics JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_valid_dev_user BOOLEAN := false;
  updated_session_id UUID;
  engagement_score_calc NUMERIC := 0.5;
  should_create_intervention BOOLEAN := false;
  intervention_id UUID;
  session_duration_minutes INTEGER;
  current_user_role app_role;
BEGIN
  -- SECURITY: Check if current user has admin role for dev functions
  SELECT public.get_user_role(auth.uid()) INTO current_user_role;
  
  IF current_user_role != 'admin' AND NOT (
    dev_user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,  -- Aisha Khan
      '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,  -- Mateo Silva
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid   -- Jade Chen
    )
  ) THEN
    RAISE EXCEPTION 'SECURITY: Admin role required for dev user session functions';
  END IF;
  
  -- Validate dev user
  IF dev_user_id IN (
    '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,  -- Aisha Khan
    '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,  -- Mateo Silva
    '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid   -- Jade Chen
  ) THEN
    is_valid_dev_user := true;
  END IF;
  
  -- Only allow authenticated users or valid dev users
  IF auth.uid() IS NULL AND NOT is_valid_dev_user THEN
    RAISE EXCEPTION 'Insufficient permissions to end session';
  END IF;
  
  -- Use provided dev_user_id or auth.uid()
  dev_user_id := COALESCE(dev_user_id, auth.uid());
  
  -- Calculate engagement score from metrics
  IF session_metrics ? 'engagement' AND session_metrics ? 'difficulty' THEN
    engagement_score_calc := (
      (session_metrics->>'engagement')::NUMERIC / 5.0 * 0.6 +
      (5.0 - (session_metrics->>'difficulty')::NUMERIC) / 5.0 * 0.4
    );
  END IF;
  
  -- Calculate session duration in minutes
  SELECT EXTRACT(EPOCH FROM (now() - started_at)) / 60 
  INTO session_duration_minutes
  FROM public.learning_engagement_sessions
  WHERE id = session_id_param AND user_id = dev_user_id;
  
  -- Update learning session with correct column names
  UPDATE public.learning_engagement_sessions
  SET 
    ended_at = now(),
    duration_minutes = COALESCE(session_duration_minutes, 0),
    engagement_score = engagement_score_calc,
    difficulty_feedback = CASE 
      WHEN session_metrics ? 'difficulty' THEN (session_metrics->>'difficulty')::INTEGER
      ELSE NULL
    END,
    activity_data = activity_data || session_metrics || jsonb_build_object('session_end', now()),
    session_notes = CASE 
      WHEN session_metrics ? 'notes' THEN session_metrics->>'notes'
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = session_id_param AND user_id = dev_user_id
  RETURNING id INTO updated_session_id;
  
  -- Check if intervention is needed (low engagement or high difficulty)
  IF engagement_score_calc < 0.3 OR (session_metrics ? 'difficulty' AND (session_metrics->>'difficulty')::NUMERIC > 4) THEN
    should_create_intervention := true;
  END IF;
  
  -- Create motivation intervention if needed using correct column names
  IF should_create_intervention THEN
    INSERT INTO public.motivation_interventions (
      user_id,
      intervention_type,
      trigger_conditions,
      intervention_data,
      confidence_score
    ) VALUES (
      dev_user_id,
      CASE 
        WHEN engagement_score_calc < 0.3 THEN 'engagement_boost'
        ELSE 'difficulty_adjustment'
      END,
      jsonb_build_object(
        'low_engagement', engagement_score_calc < 0.3,
        'high_difficulty', (session_metrics ? 'difficulty' AND (session_metrics->>'difficulty')::NUMERIC > 4),
        'session_id', session_id_param
      ),
      jsonb_build_object(
        'suggested_actions', ARRAY[
          CASE 
            WHEN engagement_score_calc < 0.3 THEN 'Try a different learning approach'
            ELSE 'Consider breaking down complex topics'
          END,
          'Take a short break and return refreshed',
          'Review prerequisites if struggling'
        ],
        'session_metrics', session_metrics,
        'session_id', session_id_param
      ),
      CASE 
        WHEN engagement_score_calc < 0.2 THEN 0.9
        ELSE 0.7
      END
    ) RETURNING id INTO intervention_id;
  END IF;
  
  RETURN updated_session_id;
END;
$function$;
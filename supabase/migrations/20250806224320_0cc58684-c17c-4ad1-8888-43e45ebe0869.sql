-- Fix dev_user_session_end function to match actual motivation_interventions schema
CREATE OR REPLACE FUNCTION public.dev_user_session_end(dev_user_id uuid, session_id_param uuid, session_metrics jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
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
BEGIN
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

-- Fix dev_user_submit_maya_feedback function to match actual maya_feedback_correlations schema
CREATE OR REPLACE FUNCTION public.dev_user_submit_maya_feedback(dev_user_id uuid, feedback_type_param text, feedback_data_param jsonb, user_rating_param integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_valid_dev_user BOOLEAN := false;
  correlation_id UUID;
  effectiveness_score NUMERIC := 0.5;
BEGIN
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
    RAISE EXCEPTION 'Insufficient permissions to submit feedback';
  END IF;
  
  -- Use provided dev_user_id or auth.uid()
  dev_user_id := COALESCE(dev_user_id, auth.uid());
  
  -- Calculate effectiveness from rating
  IF user_rating_param IS NOT NULL THEN
    effectiveness_score := user_rating_param / 5.0;
  END IF;
  
  -- Insert feedback correlation using correct column names
  INSERT INTO public.maya_feedback_correlations (
    user_id,
    feedback_type,
    feedback_data,
    user_action,
    feedback_effectiveness,
    measured_at
  ) VALUES (
    dev_user_id,
    feedback_type_param,
    feedback_data_param,
    CASE 
      WHEN user_rating_param IS NOT NULL THEN 'rated_' || user_rating_param::text
      ELSE 'submitted_feedback'
    END,
    effectiveness_score,
    now()
  ) RETURNING id INTO correlation_id;
  
  RETURN correlation_id;
END;
$function$;
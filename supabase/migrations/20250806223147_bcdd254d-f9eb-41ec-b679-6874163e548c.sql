-- Create dev user session management functions that bypass RLS

-- Function to start a learning session for dev users
CREATE OR REPLACE FUNCTION public.dev_user_session_start(
  dev_user_id UUID,
  course_id_param UUID,
  session_type_param TEXT DEFAULT 'learning'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id UUID;
  is_valid_dev_user BOOLEAN := false;
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
    RAISE EXCEPTION 'Insufficient permissions to start session';
  END IF;
  
  -- Use provided dev_user_id or auth.uid()
  dev_user_id := COALESCE(dev_user_id, auth.uid());
  
  -- Insert learning session
  INSERT INTO public.learning_engagement_sessions (
    user_id,
    session_type,
    course_id,
    started_at,
    last_activity_at,
    activity_data,
    engagement_score
  ) VALUES (
    dev_user_id,
    session_type_param,
    course_id_param,
    now(),
    now(),
    jsonb_build_object('session_start', now()),
    0.5
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Function to end a learning session for dev users
CREATE OR REPLACE FUNCTION public.dev_user_session_end(
  dev_user_id UUID,
  session_id_param UUID,
  session_metrics JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_valid_dev_user BOOLEAN := false;
  updated_session_id UUID;
  engagement_score_calc NUMERIC := 0.5;
  should_create_intervention BOOLEAN := false;
  intervention_id UUID;
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
  
  -- Update learning session
  UPDATE public.learning_engagement_sessions
  SET 
    ended_at = now(),
    session_duration_minutes = EXTRACT(EPOCH FROM (now() - started_at)) / 60,
    engagement_score = engagement_score_calc,
    activity_data = activity_data || session_metrics || jsonb_build_object('session_end', now()),
    final_metrics = session_metrics
  WHERE id = session_id_param AND user_id = dev_user_id
  RETURNING id INTO updated_session_id;
  
  -- Check if intervention is needed (low engagement or high difficulty)
  IF engagement_score_calc < 0.3 OR (session_metrics ? 'difficulty' AND (session_metrics->>'difficulty')::NUMERIC > 4) THEN
    should_create_intervention := true;
  END IF;
  
  -- Create motivation intervention if needed
  IF should_create_intervention THEN
    INSERT INTO public.motivation_interventions (
      user_id,
      intervention_type,
      trigger_conditions,
      suggested_actions,
      priority_level,
      context_data
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
      jsonb_build_array(
        CASE 
          WHEN engagement_score_calc < 0.3 THEN 'Try a different learning approach'
          ELSE 'Consider breaking down complex topics'
        END,
        'Take a short break and return refreshed',
        'Review prerequisites if struggling'
      ),
      CASE 
        WHEN engagement_score_calc < 0.2 THEN 'high'
        ELSE 'medium'
      END,
      session_metrics || jsonb_build_object('session_id', session_id_param)
    ) RETURNING id INTO intervention_id;
  END IF;
  
  RETURN updated_session_id;
END;
$$;

-- Function to submit Maya feedback for dev users
CREATE OR REPLACE FUNCTION public.dev_user_submit_maya_feedback(
  dev_user_id UUID,
  feedback_type_param TEXT,
  feedback_data_param JSONB,
  user_rating_param INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Insert feedback correlation
  INSERT INTO public.maya_feedback_correlations (
    user_id,
    feedback_type,
    feedback_data,
    user_action,
    feedback_effectiveness,
    context_data
  ) VALUES (
    dev_user_id,
    feedback_type_param,
    feedback_data_param,
    jsonb_build_object(
      'rating', user_rating_param,
      'timestamp', now(),
      'action_type', 'user_feedback'
    ),
    effectiveness_score,
    jsonb_build_object(
      'submitted_via', 'dev_user_function',
      'rating', user_rating_param
    )
  ) RETURNING id INTO correlation_id;
  
  RETURN correlation_id;
END;
$$;

-- Update RLS policies to allow service role access (for dev functions)
ALTER POLICY "Users can insert their own learning sessions" 
ON public.learning_engagement_sessions 
TO authenticated, service_role;

ALTER POLICY "Users can update their own learning sessions" 
ON public.learning_engagement_sessions 
TO authenticated, service_role;

ALTER POLICY "Users can insert their own motivation interventions" 
ON public.motivation_interventions 
TO authenticated, service_role;

ALTER POLICY "Users can update their own motivation interventions" 
ON public.motivation_interventions 
TO authenticated, service_role;

ALTER POLICY "Users can insert their own maya feedback correlations" 
ON public.maya_feedback_correlations 
TO authenticated, service_role;
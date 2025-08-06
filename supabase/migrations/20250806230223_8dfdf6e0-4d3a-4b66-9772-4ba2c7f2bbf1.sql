-- Phase 3.2: Predictive Engagement Modeling & Autonomous Interventions

-- Function to predict engagement decline based on user's learning session patterns
CREATE OR REPLACE FUNCTION public.predict_engagement_decline(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_sessions RECORD;
  session_count INTEGER;
  avg_engagement NUMERIC;
  engagement_trend NUMERIC;
  session_frequency NUMERIC;
  difficulty_trend NUMERIC;
  risk_level TEXT := 'low';
  risk_reasons TEXT[] := '{}';
  confidence_score NUMERIC := 0.5;
BEGIN
  -- Get recent session analytics (last 10 sessions or last 30 days)
  SELECT 
    COUNT(*) as total_sessions,
    AVG(engagement_score) as avg_engagement,
    AVG(difficulty_feedback) as avg_difficulty,
    EXTRACT(EPOCH FROM (MAX(started_at) - MIN(started_at))) / 3600 / 24 as date_span
  INTO recent_sessions
  FROM public.learning_engagement_sessions
  WHERE user_id = target_user_id 
    AND started_at >= NOW() - INTERVAL '30 days'
    AND engagement_score IS NOT NULL;

  session_count := COALESCE(recent_sessions.total_sessions, 0);
  avg_engagement := COALESCE(recent_sessions.avg_engagement, 0.5);
  
  -- Calculate session frequency (sessions per week)
  IF recent_sessions.date_span > 0 THEN
    session_frequency := session_count / (recent_sessions.date_span / 7);
  ELSE
    session_frequency := 0;
  END IF;

  -- Calculate engagement trend (last 5 vs previous 5 sessions)
  WITH trend_analysis AS (
    SELECT 
      engagement_score,
      ROW_NUMBER() OVER (ORDER BY started_at DESC) as session_rank
    FROM public.learning_engagement_sessions
    WHERE user_id = target_user_id 
      AND engagement_score IS NOT NULL
      AND started_at >= NOW() - INTERVAL '30 days'
    LIMIT 10
  ),
  recent_vs_older AS (
    SELECT 
      AVG(CASE WHEN session_rank <= 5 THEN engagement_score END) as recent_avg,
      AVG(CASE WHEN session_rank > 5 THEN engagement_score END) as older_avg
    FROM trend_analysis
  )
  SELECT 
    COALESCE(recent_avg - older_avg, 0) INTO engagement_trend
  FROM recent_vs_older;

  -- Risk assessment logic
  IF session_count = 0 THEN
    risk_level := 'medium';
    risk_reasons := array_append(risk_reasons, 'No recent learning activity');
    confidence_score := 0.7;
  ELSE
    -- Low engagement score
    IF avg_engagement < 0.3 THEN
      risk_level := 'high';
      risk_reasons := array_append(risk_reasons, 'Consistently low engagement scores');
      confidence_score := confidence_score + 0.3;
    ELSIF avg_engagement < 0.5 THEN
      risk_level := CASE WHEN risk_level = 'low' THEN 'medium' ELSE risk_level END;
      risk_reasons := array_append(risk_reasons, 'Below average engagement');
      confidence_score := confidence_score + 0.2;
    END IF;

    -- Declining engagement trend
    IF engagement_trend < -0.2 THEN
      risk_level := 'high';
      risk_reasons := array_append(risk_reasons, 'Significant engagement decline detected');
      confidence_score := confidence_score + 0.3;
    ELSIF engagement_trend < -0.1 THEN
      risk_level := CASE WHEN risk_level = 'low' THEN 'medium' ELSE risk_level END;
      risk_reasons := array_append(risk_reasons, 'Gradual engagement decline');
      confidence_score := confidence_score + 0.2;
    END IF;

    -- Low session frequency
    IF session_frequency < 1 THEN
      risk_level := CASE WHEN risk_level = 'low' THEN 'medium' ELSE risk_level END;
      risk_reasons := array_append(risk_reasons, 'Infrequent learning sessions');
      confidence_score := confidence_score + 0.2;
    END IF;

    -- High difficulty feedback
    IF recent_sessions.avg_difficulty > 4 THEN
      risk_level := CASE WHEN risk_level = 'low' THEN 'medium' ELSE risk_level END;
      risk_reasons := array_append(risk_reasons, 'Content difficulty too high');
      confidence_score := confidence_score + 0.15;
    END IF;
  END IF;

  -- Cap confidence score
  confidence_score := LEAST(confidence_score, 1.0);

  -- If no specific reasons found but we have data, indicate positive trends
  IF array_length(risk_reasons, 1) IS NULL AND session_count > 0 THEN
    risk_reasons := array_append(risk_reasons, 'Healthy learning pattern detected');
  END IF;

  RETURN jsonb_build_object(
    'risk_level', risk_level,
    'reasons', risk_reasons,
    'confidence_score', confidence_score,
    'session_count', session_count,
    'avg_engagement', avg_engagement,
    'engagement_trend', engagement_trend,
    'session_frequency', session_frequency,
    'analyzed_at', NOW()
  );
END;
$$;

-- Function to generate autonomous intervention based on risk assessment
CREATE OR REPLACE FUNCTION public.generate_autonomous_intervention(target_user_id UUID, risk_assessment JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  intervention_id UUID;
  intervention_type TEXT;
  intervention_data JSONB;
  confidence_score NUMERIC;
  risk_level TEXT;
  latest_session_id UUID;
BEGIN
  risk_level := risk_assessment->>'risk_level';
  confidence_score := COALESCE((risk_assessment->>'confidence_score')::NUMERIC, 0.5);

  -- Only generate interventions for medium/high risk
  IF risk_level NOT IN ('medium', 'high') THEN
    RETURN NULL;
  END IF;

  -- Get the most recent session for context
  SELECT id INTO latest_session_id
  FROM public.learning_engagement_sessions
  WHERE user_id = target_user_id
  ORDER BY started_at DESC
  LIMIT 1;

  -- Determine intervention type based on risk reasons
  IF risk_assessment->'reasons' ? 'Consistently low engagement scores' OR 
     risk_assessment->'reasons' ? 'Significant engagement decline detected' THEN
    intervention_type := 'engagement_boost';
    intervention_data := jsonb_build_object(
      'suggested_actions', ARRAY[
        'Try a different learning approach or format',
        'Take a 15-minute break and return refreshed',
        'Switch to a more interactive course section',
        'Consider studying with background music or in a different environment'
      ],
      'motivation_message', 'Your learning journey is unique - let''s find what works best for you!',
      'intervention_reason', 'low_engagement_pattern',
      'risk_assessment', risk_assessment
    );
  ELSIF risk_assessment->'reasons' ? 'Content difficulty too high' THEN
    intervention_type := 'difficulty_adjustment';
    intervention_data := jsonb_build_object(
      'suggested_actions', ARRAY[
        'Review prerequisite concepts first',
        'Break complex topics into smaller chunks',
        'Try supplementary beginner-friendly resources',
        'Consider slowing down the learning pace'
      ],
      'motivation_message', 'Learning challenging material takes time - you''re making progress!',
      'intervention_reason', 'high_difficulty',
      'risk_assessment', risk_assessment
    );
  ELSIF risk_assessment->'reasons' ? 'Infrequent learning sessions' THEN
    intervention_type := 'schedule_optimization';
    intervention_data := jsonb_build_object(
      'suggested_actions', ARRAY[
        'Set a consistent daily learning schedule',
        'Try shorter, more frequent study sessions',
        'Use calendar reminders for learning time',
        'Find an accountability partner or study group'
      ],
      'motivation_message', 'Consistency beats intensity - even 15 minutes daily makes a difference!',
      'intervention_reason', 'low_frequency',
      'risk_assessment', risk_assessment
    );
  ELSE
    intervention_type := 'general_motivation';
    intervention_data := jsonb_build_object(
      'suggested_actions', ARRAY[
        'Reflect on your learning goals and progress',
        'Try a new learning technique or tool',
        'Connect with other learners in your field',
        'Celebrate small wins and milestones'
      ],
      'motivation_message', 'Every expert was once a beginner - keep pushing forward!',
      'intervention_reason', 'general_support',
      'risk_assessment', risk_assessment
    );
  END IF;

  -- Insert the intervention
  INSERT INTO public.motivation_interventions (
    user_id,
    intervention_type,
    trigger_conditions,
    intervention_data,
    confidence_score
  ) VALUES (
    target_user_id,
    intervention_type,
    jsonb_build_object(
      'triggered_by', 'autonomous_prediction',
      'risk_level', risk_level,
      'session_id', latest_session_id,
      'prediction_confidence', confidence_score
    ),
    intervention_data,
    confidence_score
  ) RETURNING id INTO intervention_id;

  RETURN intervention_id;
END;
$$;

-- Function to update Maya feedback model based on user behavior
CREATE OR REPLACE FUNCTION public.update_maya_feedback_model(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  feedback_record RECORD;
  updated_count INTEGER := 0;
  avg_improvement NUMERIC := 0;
  model_updates JSONB := '[]'::jsonb;
BEGIN
  -- Analyze each feedback correlation to update effectiveness
  FOR feedback_record IN 
    SELECT 
      mfc.id,
      mfc.feedback_type,
      mfc.feedback_data,
      mfc.feedback_effectiveness,
      mfc.measured_at,
      -- Calculate engagement improvement in sessions after this feedback
      (
        SELECT AVG(les.engagement_score)
        FROM public.learning_engagement_sessions les
        WHERE les.user_id = target_user_id
          AND les.started_at > mfc.measured_at
          AND les.started_at <= mfc.measured_at + INTERVAL '7 days'
          AND les.engagement_score IS NOT NULL
      ) as post_feedback_engagement,
      -- Calculate baseline engagement before feedback
      (
        SELECT AVG(les.engagement_score)
        FROM public.learning_engagement_sessions les
        WHERE les.user_id = target_user_id
          AND les.started_at < mfc.measured_at
          AND les.started_at >= mfc.measured_at - INTERVAL '7 days'
          AND les.engagement_score IS NOT NULL
      ) as pre_feedback_engagement
    FROM public.maya_feedback_correlations mfc
    WHERE mfc.user_id = target_user_id
      AND mfc.measured_at >= NOW() - INTERVAL '30 days'
  LOOP
    DECLARE
      engagement_improvement NUMERIC := 0;
      new_effectiveness NUMERIC;
      improvement_factor NUMERIC := 1.0;
    BEGIN
      -- Calculate engagement improvement
      IF feedback_record.post_feedback_engagement IS NOT NULL AND 
         feedback_record.pre_feedback_engagement IS NOT NULL THEN
        engagement_improvement := feedback_record.post_feedback_engagement - feedback_record.pre_feedback_engagement;
      END IF;

      -- Calculate improvement factor based on engagement change
      IF engagement_improvement > 0.2 THEN
        improvement_factor := 1.3; -- Strong positive correlation
      ELSIF engagement_improvement > 0.1 THEN
        improvement_factor := 1.1; -- Moderate positive correlation
      ELSIF engagement_improvement < -0.1 THEN
        improvement_factor := 0.8; -- Negative correlation
      END IF;

      -- Update effectiveness score with weighted average (favor recent data)
      new_effectiveness := LEAST(1.0, 
        (feedback_record.feedback_effectiveness * 0.7) + 
        (improvement_factor * 0.3)
      );

      -- Update the feedback correlation record
      UPDATE public.maya_feedback_correlations
      SET 
        feedback_effectiveness = new_effectiveness,
        outcome_metrics = COALESCE(outcome_metrics, '{}'::jsonb) || jsonb_build_object(
          'engagement_improvement', engagement_improvement,
          'improvement_factor', improvement_factor,
          'last_model_update', NOW()
        )
      WHERE id = feedback_record.id;

      updated_count := updated_count + 1;
      avg_improvement := avg_improvement + engagement_improvement;

      -- Track the update for reporting
      model_updates := model_updates || jsonb_build_array(
        jsonb_build_object(
          'feedback_id', feedback_record.id,
          'feedback_type', feedback_record.feedback_type,
          'old_effectiveness', feedback_record.feedback_effectiveness,
          'new_effectiveness', new_effectiveness,
          'engagement_improvement', engagement_improvement
        )
      );
    END;
  END LOOP;

  -- Calculate average improvement
  IF updated_count > 0 THEN
    avg_improvement := avg_improvement / updated_count;
  END IF;

  RETURN jsonb_build_object(
    'updated_feedbacks', updated_count,
    'average_engagement_improvement', avg_improvement,
    'model_updates', model_updates,
    'updated_at', NOW()
  );
END;
$$;
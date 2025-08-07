-- Seed gamification metrics for demo users (Aisha Khan, Mateo Silva, Jade Chen)
INSERT INTO public.gamification_metrics (
  user_id,
  metric_type,
  metric_value,
  period_start,
  period_end,
  context_data
) VALUES
-- Aisha Khan daily XP metrics (last 7 days)
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 45, now() - interval '6 days', now() - interval '6 days', '{"source": "course_completion", "streak_day": 1}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 62, now() - interval '5 days', now() - interval '5 days', '{"source": "course_completion", "streak_day": 2}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 38, now() - interval '4 days', now() - interval '4 days', '{"source": "course_completion", "streak_day": 3}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 73, now() - interval '3 days', now() - interval '3 days', '{"source": "course_completion", "streak_day": 4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 55, now() - interval '2 days', now() - interval '2 days', '{"source": "course_completion", "streak_day": 5}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 81, now() - interval '1 day', now() - interval '1 day', '{"source": "course_completion", "streak_day": 6}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 67, now(), now(), '{"source": "course_completion", "streak_day": 7}'),

-- Aisha Khan streak bonus metrics
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 15, now() - interval '6 days', now() - interval '6 days', '{"multiplier": 1.1, "streak_length": 1}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 18, now() - interval '5 days', now() - interval '5 days', '{"multiplier": 1.12, "streak_length": 2}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 22, now() - interval '4 days', now() - interval '4 days', '{"multiplier": 1.14, "streak_length": 3}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 25, now() - interval '3 days', now() - interval '3 days', '{"multiplier": 1.16, "streak_length": 4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 28, now() - interval '2 days', now() - interval '2 days', '{"multiplier": 1.18, "streak_length": 5}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 31, now() - interval '1 day', now() - interval '1 day', '{"multiplier": 1.2, "streak_length": 6}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 34, now(), now(), '{"multiplier": 1.22, "streak_length": 7}'),

-- Aisha Khan Maya collaboration scores
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 85, now() - interval '6 days', now() - interval '6 days', '{"interactions": 3, "quality_score": 4.2}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 88, now() - interval '5 days', now() - interval '5 days', '{"interactions": 4, "quality_score": 4.4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 91, now() - interval '4 days', now() - interval '4 days', '{"interactions": 5, "quality_score": 4.5}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 87, now() - interval '3 days', now() - interval '3 days', '{"interactions": 3, "quality_score": 4.3}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 93, now() - interval '2 days', now() - interval '2 days', '{"interactions": 6, "quality_score": 4.6}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 89, now() - interval '1 day', now() - interval '1 day', '{"interactions": 4, "quality_score": 4.4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 94, now(), now(), '{"interactions": 7, "quality_score": 4.7}'),

-- Aisha Khan engagement trend metrics  
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.72, now() - interval '6 days', now() - interval '6 days', '{"session_duration": 45, "completion_rate": 0.8}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.75, now() - interval '5 days', now() - interval '5 days', '{"session_duration": 52, "completion_rate": 0.85}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.78, now() - interval '4 days', now() - interval '4 days', '{"session_duration": 48, "completion_rate": 0.9}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.74, now() - interval '3 days', now() - interval '3 days', '{"session_duration": 43, "completion_rate": 0.82}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.81, now() - interval '2 days', now() - interval '2 days', '{"session_duration": 58, "completion_rate": 0.95}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.77, now() - interval '1 day', now() - interval '1 day', '{"session_duration": 50, "completion_rate": 0.88}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.83, now(), now(), '{"session_duration": 62, "completion_rate": 0.98}'),

-- Mateo Silva metrics (smaller dataset)
('3c459625-e499-5ddb-b64d-a442dd21f474', 'daily_xp', 32, now() - interval '2 days', now() - interval '2 days', '{"source": "course_completion", "streak_day": 1}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'daily_xp', 48, now() - interval '1 day', now() - interval '1 day', '{"source": "course_completion", "streak_day": 2}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'daily_xp', 55, now(), now(), '{"source": "course_completion", "streak_day": 3}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'maya_collaboration', 76, now() - interval '2 days', now() - interval '2 days', '{"interactions": 2, "quality_score": 3.8}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'maya_collaboration', 82, now() - interval '1 day', now() - interval '1 day', '{"interactions": 3, "quality_score": 4.1}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'maya_collaboration', 85, now(), now(), '{"interactions": 4, "quality_score": 4.2}'),

-- Jade Chen metrics (smaller dataset)
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'daily_xp', 29, now() - interval '1 day', now() - interval '1 day', '{"source": "course_completion", "streak_day": 1}'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'daily_xp', 41, now(), now(), '{"source": "course_completion", "streak_day": 2}'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'maya_collaboration', 73, now() - interval '1 day', now() - interval '1 day', '{"interactions": 2, "quality_score": 3.6}'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'maya_collaboration', 79, now(), now(), '{"interactions": 3, "quality_score": 3.9}');

-- Create missing database functions
CREATE OR REPLACE FUNCTION public.calculate_xp_multiplier(user_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_streak INTEGER;
  multiplier NUMERIC := 1.0;
BEGIN
  -- Get current learning streak
  SELECT COALESCE(current_streak, 0) INTO current_streak
  FROM public.learning_streaks
  WHERE user_id = user_id_param AND streak_type = 'daily'
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- Calculate multiplier based on streak (max 1.5x)
  multiplier := LEAST(1.0 + (current_streak * 0.02), 1.5);
  
  RETURN multiplier;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_celebration_moment(
  user_id_param uuid,
  celebration_type_param text,
  trigger_data_param jsonb,
  celebration_data_param jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  celebration_id UUID;
BEGIN
  -- Insert celebration moment
  INSERT INTO public.celebration_moments (
    user_id,
    celebration_type,
    trigger_data,
    celebration_data
  ) VALUES (
    user_id_param,
    celebration_type_param,
    trigger_data_param,
    celebration_data_param
  ) RETURNING id INTO celebration_id;
  
  RETURN celebration_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_learning_streak(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_record RECORD;
  milestone_reached BOOLEAN := false;
  result JSONB;
BEGIN
  -- Get or create learning streak record
  SELECT * INTO current_record
  FROM public.learning_streaks
  WHERE user_id = user_id_param AND streak_type = 'daily'
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF current_record IS NULL THEN
    -- Create new streak
    INSERT INTO public.learning_streaks (
      user_id, streak_type, current_streak, longest_streak, 
      last_activity_date, streak_start_date, bonus_multiplier
    ) VALUES (
      user_id_param, 'daily', 1, 1, 
      CURRENT_DATE, CURRENT_DATE, 1.02
    );
    
    milestone_reached := true;
    result := jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'milestone_reached', milestone_reached,
      'bonus_multiplier', 1.02
    );
  ELSE
    -- Check if we need to update streak
    IF current_record.last_activity_date = CURRENT_DATE THEN
      -- Already updated today
      result := jsonb_build_object(
        'current_streak', current_record.current_streak,
        'longest_streak', current_record.longest_streak,
        'milestone_reached', false,
        'bonus_multiplier', current_record.bonus_multiplier
      );
    ELSIF current_record.last_activity_date = CURRENT_DATE - 1 THEN
      -- Continue streak
      UPDATE public.learning_streaks
      SET 
        current_streak = current_record.current_streak + 1,
        longest_streak = GREATEST(current_record.longest_streak, current_record.current_streak + 1),
        last_activity_date = CURRENT_DATE,
        bonus_multiplier = LEAST(1.0 + ((current_record.current_streak + 1) * 0.02), 1.5),
        updated_at = now()
      WHERE id = current_record.id;
      
      -- Check for milestones (every 7 days)
      IF (current_record.current_streak + 1) % 7 = 0 THEN
        milestone_reached := true;
      END IF;
      
      result := jsonb_build_object(
        'current_streak', current_record.current_streak + 1,
        'longest_streak', GREATEST(current_record.longest_streak, current_record.current_streak + 1),
        'milestone_reached', milestone_reached,
        'bonus_multiplier', LEAST(1.0 + ((current_record.current_streak + 1) * 0.02), 1.5)
      );
    ELSE
      -- Streak broken, reset
      UPDATE public.learning_streaks
      SET 
        current_streak = 1,
        last_activity_date = CURRENT_DATE,
        streak_start_date = CURRENT_DATE,
        bonus_multiplier = 1.02,
        updated_at = now()
      WHERE id = current_record.id;
      
      result := jsonb_build_object(
        'current_streak', 1,
        'longest_streak', current_record.longest_streak,
        'milestone_reached', false,
        'bonus_multiplier', 1.02,
        'streak_broken', true
      );
    END IF;
  END IF;
  
  RETURN result;
END;
$function$;
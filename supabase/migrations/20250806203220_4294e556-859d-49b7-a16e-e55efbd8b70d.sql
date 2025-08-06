-- Simple data insertion for Aisha Khan without complex conflicts
DELETE FROM public.learning_sessions WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363';
DELETE FROM public.goal_learning_paths WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363';
DELETE FROM public.enhanced_user_profiles WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363';

-- Insert enhanced user profile for Aisha
INSERT INTO public.enhanced_user_profiles (
  user_id,
  learning_style,
  available_hours_per_week,
  preferred_learning_times,
  career_goals,
  skill_assessments,
  motivational_factors,
  learning_preferences
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  jsonb_build_object(
    'visual', 70,
    'auditory', 15,
    'kinesthetic', 10,
    'reading', 5
  ),
  10,
  ARRAY['evening', 'weekend'],
  ARRAY['Front-End Developer', 'React Specialist'],
  jsonb_build_object(
    'JavaScript', jsonb_build_object('level', 'intermediate', 'confidence', 7),
    'React', jsonb_build_object('level', 'beginner', 'confidence', 5),
    'CSS', jsonb_build_object('level', 'advanced', 'confidence', 8),
    'HTML', jsonb_build_object('level', 'advanced', 'confidence', 9),
    'TypeScript', jsonb_build_object('level', 'beginner', 'confidence', 3)
  ),
  ARRAY['career_advancement', 'skill_mastery'],
  jsonb_build_object(
    'difficulty_preference', 'progressive',
    'daily_time_minutes', 60
  )
);

-- Insert goal learning path for Aisha
INSERT INTO public.goal_learning_paths (
  user_id,
  goal_id,
  path_data,
  milestones,
  confidence_score,
  generated_by_ai
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  (SELECT id FROM career_goals WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363' AND active = true LIMIT 1),
  jsonb_build_object(
    'target_role', 'Front-End Developer',
    'estimated_duration_weeks', 16,
    'learning_path', jsonb_build_array(
      jsonb_build_object(
        'step_id', 1,
        'title', 'JavaScript Fundamentals',
        'description', 'Master ES6+ and modern JavaScript',
        'estimated_hours', 25,
        'difficulty', 'intermediate'
      ),
      jsonb_build_object(
        'step_id', 2,
        'title', 'React Development',
        'description', 'Build interactive UIs with React',
        'estimated_hours', 30,
        'difficulty', 'intermediate'
      )
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'id', 1,
      'title', 'Complete JavaScript Fundamentals',
      'completed', false,
      'progress_percentage', 0
    ),
    jsonb_build_object(
      'id', 2,
      'title', 'Build First React App',
      'completed', false,
      'progress_percentage', 0
    )
  ),
  92.5,
  true
);

-- Insert learning sessions for Aisha
INSERT INTO public.learning_sessions (
  user_id,
  session_data,
  performance_metrics,
  ai_recommendations
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  jsonb_build_object(
    'session_type', 'skill_practice',
    'topic', 'JavaScript ES6+ Features',
    'duration_minutes', 45
  ),
  jsonb_build_object(
    'engagement_score', 8.5,
    'completion_rate', 0.80
  ),
  jsonb_build_object(
    'next_focus_areas', jsonb_build_array('Arrow Functions'),
    'confidence_score', 0.78
  )
);
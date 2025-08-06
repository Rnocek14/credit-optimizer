-- Final corrected data insertion with proper column names
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
  jsonb_build_object('visual', 70, 'auditory', 15, 'kinesthetic', 10, 'reading', 5),
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
  jsonb_build_object('difficulty_preference', 'progressive', 'daily_time_minutes', 60)
);

-- Insert goal learning path using correct columns
INSERT INTO public.goal_learning_paths (
  user_id,
  goal_id,
  path_type,
  path_nodes,
  estimated_completion_weeks,
  cost_estimate,
  difficulty_level,
  success_rate,
  personalization_score,
  market_alignment_score,
  generated_by,
  is_active
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  (SELECT id FROM career_goals WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363' AND active = true LIMIT 1),
  'primary',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'js-fundamentals',
      'type', 'skill',
      'title', 'JavaScript Fundamentals',
      'description', 'Master ES6+ features and modern JavaScript patterns',
      'estimatedWeeks', 4,
      'difficulty', 3,
      'costEstimate', 50
    ),
    jsonb_build_object(
      'id', 'react-development',
      'type', 'course',
      'title', 'React Development',
      'description', 'Build interactive UIs with React hooks and state management',
      'estimatedWeeks', 6,
      'difficulty', 4,
      'costEstimate', 200
    )
  ),
  16,
  350,
  4,
  0.92,
  0.95,
  0.88,
  'ai_enhanced',
  true
);
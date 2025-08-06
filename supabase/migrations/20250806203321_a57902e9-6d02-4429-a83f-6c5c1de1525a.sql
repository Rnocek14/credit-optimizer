-- Corrected data insertion using actual table columns
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
      'description', 'Master ES6+ features, async programming, and modern JavaScript patterns',
      'estimatedWeeks', 4,
      'difficulty', 3,
      'prerequisites', jsonb_build_array(),
      'costEstimate', 50,
      'importance', 0.9,
      'marketRelevance', 0.95,
      'personalizedReason', 'Strong foundation needed for React development'
    ),
    jsonb_build_object(
      'id', 'react-development',
      'type', 'course',
      'title', 'React Development',
      'description', 'Build interactive UIs with React hooks, state management, and component architecture',
      'estimatedWeeks', 6,
      'difficulty', 4,
      'prerequisites', jsonb_build_array('js-fundamentals'),
      'costEstimate', 200,
      'importance', 1.0,
      'marketRelevance', 0.98,
      'personalizedReason', 'Core technology for your target role as Front-End Developer'
    ),
    jsonb_build_object(
      'id', 'typescript-integration',
      'type', 'skill',
      'title', 'TypeScript Integration',
      'description', 'Add type safety and better tooling to React applications',
      'estimatedWeeks', 3,
      'difficulty', 4,
      'prerequisites', jsonb_build_array('react-development'),
      'costEstimate', 75,
      'importance', 0.8,
      'marketRelevance', 0.9,
      'personalizedReason', 'Industry standard for scalable React applications'
    ),
    jsonb_build_object(
      'id', 'portfolio-project',
      'type', 'project',
      'title', 'Portfolio Website Project',
      'description', 'Build a professional portfolio showcasing React and TypeScript skills',
      'estimatedWeeks', 3,
      'difficulty', 5,
      'prerequisites', jsonb_build_array('typescript-integration'),
      'costEstimate', 25,
      'importance', 0.9,
      'marketRelevance', 0.95,
      'personalizedReason', 'Demonstrates your skills to potential employers'
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
    'duration_minutes', 45,
    'completed_exercises', 8,
    'total_exercises', 10,
    'difficulty_level', 'intermediate',
    'current_learning_node', 'js-fundamentals'
  ),
  jsonb_build_object(
    'engagement_score', 8.5,
    'completion_rate', 0.80,
    'comprehension_rate', 0.85,
    'time_efficiency', 0.92,
    'error_rate', 0.15,
    'improvement_areas', jsonb_build_array('Arrow Functions', 'Destructuring'),
    'strengths', jsonb_build_array('Template Literals', 'Let/Const Usage')
  ),
  jsonb_build_object(
    'next_focus_areas', jsonb_build_array('Practice more arrow functions', 'Review destructuring patterns'),
    'difficulty_adjustment', 'maintain',
    'content_recommendations', jsonb_build_array('Interactive ES6 challenges', 'Real-world examples'),
    'session_feedback', 'Great progress on template literals! Focus on arrow function syntax next.',
    'confidence_score', 0.78
  )
),
(
  '2b458624-d498-4cca-a63d-9341cc20e363',
  jsonb_build_object(
    'session_type', 'project_work',
    'topic', 'Building React Components',
    'duration_minutes', 60,
    'completed_exercises', 3,
    'total_exercises', 5,
    'difficulty_level', 'intermediate',
    'current_learning_node', 'react-development'
  ),
  jsonb_build_object(
    'engagement_score', 9.2,
    'completion_rate', 0.60,
    'comprehension_rate', 0.75,
    'time_efficiency', 0.88,
    'error_rate', 0.25,
    'improvement_areas', jsonb_build_array('useState Hook', 'Event Handling'),
    'strengths', jsonb_build_array('JSX Syntax', 'Component Structure')
  ),
  jsonb_build_object(
    'next_focus_areas', jsonb_build_array('Practice useState with different data types', 'Event handling patterns'),
    'difficulty_adjustment', 'slightly_easier',
    'content_recommendations', jsonb_build_array('useState examples', 'Event handling tutorial'),
    'session_feedback', 'Good grasp of JSX! Spend more time on state management concepts.',
    'confidence_score', 0.65
  )
);
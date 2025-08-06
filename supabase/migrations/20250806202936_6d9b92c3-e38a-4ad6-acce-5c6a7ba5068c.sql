-- Seed Phase 2 data for Aisha Khan (dev user) - FIXED COLUMN NAMES
-- Insert enhanced user profile
INSERT INTO public.enhanced_user_profiles (
  user_id,
  learning_style,
  available_hours_per_week,
  preferred_learning_times,
  career_goals,
  skill_assessments,
  motivational_factors,
  learning_preferences,
  updated_at
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
  ARRAY['Front-End Developer', 'React Specialist', 'JavaScript Expert'],
  jsonb_build_object(
    'JavaScript', jsonb_build_object('level', 'intermediate', 'confidence', 7, 'last_assessed', now()),
    'React', jsonb_build_object('level', 'beginner', 'confidence', 5, 'last_assessed', now()),
    'CSS', jsonb_build_object('level', 'advanced', 'confidence', 8, 'last_assessed', now()),
    'HTML', jsonb_build_object('level', 'advanced', 'confidence', 9, 'last_assessed', now()),
    'TypeScript', jsonb_build_object('level', 'beginner', 'confidence', 3, 'last_assessed', now())
  ),
  ARRAY['career_advancement', 'skill_mastery', 'project_creation'],
  jsonb_build_object(
    'difficulty_preference', 'progressive',
    'content_types', jsonb_build_array('interactive', 'video', 'hands-on'),
    'feedback_frequency', 'immediate',
    'goal_setting_style', 'milestone-based',
    'daily_time_minutes', 60,
    'timezone', 'America/New_York'
  ),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  learning_style = EXCLUDED.learning_style,
  available_hours_per_week = EXCLUDED.available_hours_per_week,
  preferred_learning_times = EXCLUDED.preferred_learning_times,
  career_goals = EXCLUDED.career_goals,
  skill_assessments = EXCLUDED.skill_assessments,
  motivational_factors = EXCLUDED.motivational_factors,
  learning_preferences = EXCLUDED.learning_preferences,
  updated_at = now();

-- Ensure Aisha has a career goal first
INSERT INTO public.career_goals (
  user_id,
  title,
  description,
  target_role,
  target_date,
  skill_gaps,
  priority_score,
  market_demand_score,
  estimated_timeline_weeks
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'Become a Front-End Developer',
  'Transition to a front-end development role with expertise in React, TypeScript, and modern web technologies',
  'Front-End Developer',
  (now() + interval '16 weeks')::date,
  ARRAY['React Hooks', 'TypeScript', 'State Management', 'Testing', 'Performance Optimization'],
  95,
  88,
  16
) ON CONFLICT (user_id, title) DO UPDATE SET
  description = EXCLUDED.description,
  skill_gaps = EXCLUDED.skill_gaps,
  updated_at = now();

-- Insert goal learning path for Aisha's Front-End Developer goal
INSERT INTO public.goal_learning_paths (
  user_id,
  goal_id,
  path_data,
  milestones,
  confidence_score,
  generated_by_ai,
  updated_at
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  (SELECT id FROM career_goals WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363' AND title = 'Become a Front-End Developer' LIMIT 1),
  jsonb_build_object(
    'target_role', 'Front-End Developer',
    'estimated_duration_weeks', 16,
    'learning_path', jsonb_build_array(
      jsonb_build_object(
        'step_id', 1,
        'title', 'Strengthen JavaScript Fundamentals',
        'description', 'Master ES6+, async programming, and modern JavaScript patterns',
        'estimated_hours', 25,
        'difficulty', 'intermediate',
        'resources', jsonb_build_array('JavaScript.info', 'MDN Web Docs', 'Eloquent JavaScript'),
        'skills_gained', jsonb_build_array('ES6+', 'Promises', 'Async/Await', 'Modules')
      ),
      jsonb_build_object(
        'step_id', 2,
        'title', 'Learn React Development',
        'description', 'Build interactive UIs with React hooks, state management, and component architecture',
        'estimated_hours', 30,
        'difficulty', 'intermediate',
        'resources', jsonb_build_array('React Documentation', 'React Router', 'State Management'),
        'skills_gained', jsonb_build_array('React Hooks', 'Component Design', 'State Management', 'Routing')
      ),
      jsonb_build_object(
        'step_id', 3,
        'title', 'Master TypeScript',
        'description', 'Add type safety and better tooling to your React applications',
        'estimated_hours', 20,
        'difficulty', 'intermediate',
        'resources', jsonb_build_array('TypeScript Handbook', 'React + TypeScript', 'Type Challenges'),
        'skills_gained', jsonb_build_array('Static Typing', 'Interface Design', 'Generic Types', 'React TypeScript')
      ),
      jsonb_build_object(
        'step_id', 4,
        'title', 'Build Portfolio Projects',
        'description', 'Create 3-5 production-ready applications to showcase your skills',
        'estimated_hours', 40,
        'difficulty', 'advanced',
        'resources', jsonb_build_array('GitHub Pages', 'Vercel', 'Portfolio Examples'),
        'skills_gained', jsonb_build_array('Project Planning', 'Deployment', 'Version Control', 'Documentation')
      )
    ),
    'prerequisites_met', jsonb_build_object('HTML', true, 'CSS', true, 'Basic_JavaScript', true),
    'skill_gaps_identified', jsonb_build_array('React Hooks', 'TypeScript', 'State Management', 'Testing')
  ),
  jsonb_build_array(
    jsonb_build_object(
      'id', 1,
      'title', 'Complete JavaScript Fundamentals',
      'target_date', (now() + interval '4 weeks')::date,
      'completed', false,
      'progress_percentage', 0
    ),
    jsonb_build_object(
      'id', 2,
      'title', 'Build First React Application',
      'target_date', (now() + interval '8 weeks')::date,
      'completed', false,
      'progress_percentage', 0
    ),
    jsonb_build_object(
      'id', 3,
      'title', 'Integrate TypeScript',
      'target_date', (now() + interval '12 weeks')::date,
      'completed', false,
      'progress_percentage', 0
    ),
    jsonb_build_object(
      'id', 4,
      'title', 'Deploy Portfolio Website',
      'target_date', (now() + interval '16 weeks')::date,
      'completed', false,
      'progress_percentage', 0
    )
  ),
  92.5,
  true,
  now()
) ON CONFLICT (user_id, goal_id) DO UPDATE SET
  path_data = EXCLUDED.path_data,
  milestones = EXCLUDED.milestones,
  confidence_score = EXCLUDED.confidence_score,
  updated_at = now();

-- Insert sample learning sessions to show progress tracking
INSERT INTO public.learning_sessions (
  user_id,
  session_data,
  performance_metrics,
  ai_recommendations,
  updated_at
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  jsonb_build_object(
    'session_type', 'skill_practice',
    'topic', 'JavaScript ES6+ Features',
    'duration_minutes', 45,
    'completed_exercises', 8,
    'total_exercises', 10,
    'difficulty_level', 'intermediate',
    'learning_path_step', 1,
    'resources_used', jsonb_build_array('Interactive Coding', 'Video Tutorial', 'Documentation')
  ),
  jsonb_build_object(
    'engagement_score', 8.5,
    'comprehension_rate', 0.85,
    'completion_rate', 0.80,
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
  ),
  now()
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
    'learning_path_step', 2,
    'resources_used', jsonb_build_array('React Documentation', 'Code Editor', 'Browser DevTools')
  ),
  jsonb_build_object(
    'engagement_score', 9.2,
    'comprehension_rate', 0.75,
    'completion_rate', 0.60,
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
  ),
  now()
);
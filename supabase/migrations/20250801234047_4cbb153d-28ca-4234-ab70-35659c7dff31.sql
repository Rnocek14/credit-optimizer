-- Populate missing test data for Phase 4 validation (simplified)

-- Create user XP data for test user
INSERT INTO public.user_xp (user_id, total_xp) 
SELECT '00000000-0000-0000-0000-000000000001', 450
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_xp 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

-- Create workflow steps for the active autonomous workflow
WITH workflow_id AS (
  SELECT id FROM public.autonomous_workflows 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' 
  AND title = 'AI-Driven Skill Development Plan'
  LIMIT 1
)
INSERT INTO public.workflow_steps (workflow_id, step_order, title, description, step_type, status, estimated_duration_hours, config)
SELECT 
  workflow_id.id,
  1,
  'Complete Python Fundamentals Course',
  'Build foundational Python programming skills',
  'course_completion',
  'completed',
  40,
  '{"course_id": "python-fundamentals", "required_score": 80}'::jsonb
FROM workflow_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_steps ws
  JOIN workflow_id ON ws.workflow_id = workflow_id.id
  WHERE ws.step_order = 1
)
UNION ALL
SELECT 
  workflow_id.id,
  2,
  'Machine Learning Specialization',
  'Advanced ML concepts and practical implementation',
  'course_completion',
  'in_progress',
  60,
  '{"course_id": "ml-specialization", "progress": 35}'::jsonb
FROM workflow_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_steps ws
  JOIN workflow_id ON ws.workflow_id = workflow_id.id
  WHERE ws.step_order = 2
)
UNION ALL
SELECT 
  workflow_id.id,
  3,
  'Portfolio Project: Predictive Analytics',
  'Build and deploy a real-world ML project',
  'project_completion',
  'pending',
  80,
  '{"project_type": "predictive_analytics", "requirements": ["data_collection", "model_training", "deployment"]}'::jsonb
FROM workflow_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_steps ws
  JOIN workflow_id ON ws.workflow_id = workflow_id.id
  WHERE ws.step_order = 3
);

-- Create learning milestones for the test user
INSERT INTO public.learning_milestones (user_id, milestone_type, milestone_data, xp_awarded)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'course_completion',
  '{"course_title": "Python Fundamentals", "completion_date": "2024-01-15", "score": 88}'::jsonb,
  50
WHERE NOT EXISTS (
  SELECT 1 FROM public.learning_milestones 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' 
  AND milestone_type = 'course_completion'
)
UNION ALL
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'skill_level_up',
  '{"skill": "data_analysis", "previous_level": 2, "new_level": 3}'::jsonb,
  25
WHERE NOT EXISTS (
  SELECT 1 FROM public.learning_milestones 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' 
  AND milestone_type = 'skill_level_up'
);

-- Create course progress for the test user
INSERT INTO public.course_progress (user_id, course_id, status, progress_percentage, started_at, completed_at, time_spent_hours, xp_awarded)
VALUES 
  ('00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'completed', 100, now() - interval '3 weeks', now() - interval '1 week', 40, 50),
  ('00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'in_progress', 65, now() - interval '1 week', NULL, 25, 25)
ON CONFLICT DO NOTHING;

-- Create alert history for market pulse validation
INSERT INTO public.alert_history (user_id, alert_config_id, alert_message, metric_value, threshold_value, confidence_score)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  gen_random_uuid(),
  'High demand surge detected for Machine Learning skills in your area',
  9.2,
  8.0,
  0.89
WHERE NOT EXISTS (
  SELECT 1 FROM public.alert_history 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

-- Create conversation context for Maya assistant
INSERT INTO public.conversation_context (user_id, context_type, context_key, context_value, importance_score)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'career_goal',
  'primary_objective',
  '{"goal": "transition_to_ml_engineer", "timeline": "6_months", "current_progress": 35}'::jsonb,
  0.9
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_context 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' 
  AND context_type = 'career_goal'
);
-- Populate missing test data for Phase 4 validation (with proper UUID casting)

-- Create user XP data for test user
INSERT INTO public.user_xp (user_id, total_xp) 
SELECT '00000000-0000-0000-0000-000000000001'::uuid, 450
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_xp 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Create learning milestones for the test user
INSERT INTO public.learning_milestones (user_id, milestone_type, milestone_data, xp_awarded)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'course_completion',
  '{"course_title": "Python Fundamentals", "completion_date": "2024-01-15", "score": 88}'::jsonb,
  50
WHERE NOT EXISTS (
  SELECT 1 FROM public.learning_milestones 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid 
  AND milestone_type = 'course_completion'
)
UNION ALL
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'skill_level_up',
  '{"skill": "data_analysis", "previous_level": 2, "new_level": 3}'::jsonb,
  25
WHERE NOT EXISTS (
  SELECT 1 FROM public.learning_milestones 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid 
  AND milestone_type = 'skill_level_up'
);

-- Create course progress for the test user
INSERT INTO public.course_progress (user_id, course_id, status, progress_percentage, started_at, completed_at, time_spent_hours, xp_awarded)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), 'completed', 100, now() - interval '3 weeks', now() - interval '1 week', 40, 50),
  ('00000000-0000-0000-0000-000000000001'::uuid, gen_random_uuid(), 'in_progress', 65, now() - interval '1 week', NULL, 25, 25)
ON CONFLICT DO NOTHING;

-- Create conversation context for Maya assistant
INSERT INTO public.conversation_context (user_id, context_type, context_key, context_value, importance_score)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'career_goal',
  'primary_objective',
  '{"goal": "transition_to_ml_engineer", "timeline": "6_months", "current_progress": 35}'::jsonb,
  0.9
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_context 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid 
  AND context_type = 'career_goal'
);
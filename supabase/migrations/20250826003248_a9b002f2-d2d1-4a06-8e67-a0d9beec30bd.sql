-- Seed fresh context with required context_type to enable generator to pick users
INSERT INTO public.maya_context_tracking (user_id, context_type, event_type, context_data, created_at)
VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'page', 'page_visit', jsonb_build_object('path','/today'), now() - interval '15 minutes'),
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'goal', 'goal_progress', jsonb_build_object('goal_id','demo','delta',1), now() - interval '10 minutes'),
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'course', 'course_interaction', jsonb_build_object('course_id','python-basics','action','completed_lesson'), now() - interval '5 minutes'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'page', 'page_visit', jsonb_build_object('path','/career-track'), now() - interval '20 minutes'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'assessment', 'skill_assessment', jsonb_build_object('skill','javascript','score',85), now() - interval '8 minutes'),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'page', 'page_visit', jsonb_build_object('path','/dashboard'), now() - interval '25 minutes'),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'milestone', 'learning_milestone', jsonb_build_object('milestone_type','first_project_completed'), now() - interval '3 minutes');
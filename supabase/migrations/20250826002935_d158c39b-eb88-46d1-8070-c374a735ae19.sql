-- Fix Maya insights system: seed fresh context tracking events and trigger smoke test

-- 1) Seed fresh context tracking events for dev users (last 30 minutes)
INSERT INTO public.maya_context_tracking (user_id, event_type, context_data, created_at)
VALUES
  -- Aisha Khan - recent activity
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'page_visit', 
   jsonb_build_object('path', '/today', 'user_agent', 'Maya Test', 'timestamp', now()), 
   now() - interval '15 minutes'),
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'goal_progress', 
   jsonb_build_object('goal_id', 'test-goal', 'progress_delta', 10, 'milestone', 'skill_assessment'), 
   now() - interval '10 minutes'),
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'course_interaction', 
   jsonb_build_object('course_id', 'python-basics', 'action', 'completed_lesson', 'lesson_id', 'variables'), 
   now() - interval '5 minutes'),
  
  -- Mateo Silva - recent activity  
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'page_visit', 
   jsonb_build_object('path', '/career-track', 'user_agent', 'Maya Test', 'timestamp', now()), 
   now() - interval '20 minutes'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'skill_assessment', 
   jsonb_build_object('skill', 'javascript', 'score', 85, 'assessment_type', 'practical'), 
   now() - interval '8 minutes'),
   
  -- Jade Chen - recent activity
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'page_visit', 
   jsonb_build_object('path', '/dashboard', 'user_agent', 'Maya Test', 'timestamp', now()), 
   now() - interval '25 minutes'),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'learning_milestone', 
   jsonb_build_object('milestone_type', 'first_project_completed', 'project_name', 'Personal Portfolio'), 
   now() - interval '3 minutes');

-- 2) Trigger smoke test for maya-insight-generator (with both auth methods)
SELECT net.http_post(
  url := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
  headers := jsonb_build_object(
    'content-type', 'application/json',
    'authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI',
    'x-cron-secret', (SELECT value FROM vault.secrets WHERE name = 'CRON_SECRET')
  ),
  body := '{}'::jsonb
) AS smoke_test_request_id;
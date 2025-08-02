-- Phase 5 Preparation: Enhanced Data Seeding and System Improvements

-- 1. Create workflow_steps table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.autonomous_workflows(id),
  user_id UUID NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'action',
  step_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  confidence_score NUMERIC DEFAULT 0.8,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on workflow_steps
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workflow_steps
CREATE POLICY "Users can view their own workflow steps" 
ON public.workflow_steps FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all workflow steps" 
ON public.workflow_steps FOR ALL 
USING (true);

-- 2. Create maya_decisions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.maya_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  decision_type TEXT NOT NULL,
  decision_context JSONB NOT NULL DEFAULT '{}',
  recommended_action JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  reasoning TEXT,
  impact_score NUMERIC DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'pending',
  auto_approved BOOLEAN DEFAULT false,
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Enable RLS on maya_decisions
ALTER TABLE public.maya_decisions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for maya_decisions
CREATE POLICY "Users can view their own maya decisions" 
ON public.maya_decisions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all maya decisions" 
ON public.maya_decisions FOR ALL 
USING (true);

-- 3. Create goal_market_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.goal_market_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_id UUID REFERENCES public.career_goals(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  market_data JSONB NOT NULL DEFAULT '{}',
  alert_message TEXT NOT NULL,
  action_items JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- Enable RLS on goal_market_alerts
ALTER TABLE public.goal_market_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goal_market_alerts
CREATE POLICY "Users can view their own goal market alerts" 
ON public.goal_market_alerts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all goal market alerts" 
ON public.goal_market_alerts FOR ALL 
USING (true);

-- 4. Populate workflow steps for existing workflow
INSERT INTO public.workflow_steps (workflow_id, user_id, step_name, step_type, step_order, status, input_data, output_data, confidence_score, started_at, completed_at)
SELECT 
  w.id,
  w.user_id,
  'Market Analysis',
  'analysis',
  1,
  'completed',
  '{"market_focus": "machine_learning", "location": "global"}'::jsonb,
  '{"demand_score": 92, "growth_rate": 15.3, "salary_trend": "increasing"}'::jsonb,
  0.94,
  now() - interval '2 days',
  now() - interval '2 days' + interval '45 minutes'
FROM autonomous_workflows w 
WHERE w.user_id = '00000000-0000-0000-0000-000000000001'::uuid
AND NOT EXISTS (
  SELECT 1 FROM workflow_steps ws 
  WHERE ws.workflow_id = w.id AND ws.step_name = 'Market Analysis'
)

UNION ALL

SELECT 
  w.id,
  w.user_id,
  'Skill Gap Assessment',
  'assessment',
  2,
  'completed',
  '{"current_skills": ["python", "data_analysis"], "target_skills": ["machine_learning", "deep_learning"]}'::jsonb,
  '{"gap_score": 67, "priority_skills": ["tensorflow", "pytorch", "ml_ops"], "estimated_hours": 120}'::jsonb,
  0.89,
  now() - interval '2 days' + interval '1 hour',
  now() - interval '1 day' + interval '30 minutes'
FROM autonomous_workflows w 
WHERE w.user_id = '00000000-0000-0000-0000-000000000001'::uuid
AND NOT EXISTS (
  SELECT 1 FROM workflow_steps ws 
  WHERE ws.workflow_id = w.id AND ws.step_name = 'Skill Gap Assessment'
)

UNION ALL

SELECT 
  w.id,
  w.user_id,
  'Learning Path Generation',
  'generation',
  3,
  'in_progress',
  '{"gap_analysis": {"priority_skills": ["tensorflow", "pytorch", "ml_ops"]}, "timeline_weeks": 12}'::jsonb,
  '{"courses_identified": 8, "certification_paths": 3, "project_recommendations": 5}'::jsonb,
  0.91,
  now() - interval '1 day',
  NULL
FROM autonomous_workflows w 
WHERE w.user_id = '00000000-0000-0000-0000-000000000001'::uuid
AND NOT EXISTS (
  SELECT 1 FROM workflow_steps ws 
  WHERE ws.workflow_id = w.id AND ws.step_name = 'Learning Path Generation'
);

-- 5. Create Maya decisions for test user
INSERT INTO public.maya_decisions (user_id, decision_type, decision_context, recommended_action, confidence_score, reasoning, impact_score, status, auto_approved)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'skill_prioritization',
    '{"current_goal": "ml_engineer", "market_demand": 92, "user_progress": 35}'::jsonb,
    '{"action": "prioritize_tensorflow", "timeline": "4_weeks", "resources": ["course_tensorflow_cert", "project_ml_pipeline"]}'::jsonb,
    0.87,
    'Market analysis shows 23% increase in TensorFlow demand. User has strong Python foundation, making this the optimal next skill.',
    0.92,
    'approved',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'course_recommendation',
    '{"skill_gap": "ml_ops", "urgency": "medium", "budget_preference": "free"}'::jsonb,
    '{"action": "enroll_course", "course_id": "ml_ops_fundamentals", "platform": "coursera", "duration_weeks": 6}'::jsonb,
    0.91,
    'MLOps skills are increasingly critical for ML engineer roles. Free Coursera course aligns with budget constraints.',
    0.78,
    'pending',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'market_opportunity',
    '{"location": "remote", "salary_increase": 15000, "demand_spike": true}'::jsonb,
    '{"action": "accelerate_timeline", "new_target": "4_months", "focus_areas": ["ml_engineering", "data_pipelines"]}'::jsonb,
    0.83,
    'Remote ML engineering roles show 34% salary increase. Accelerating timeline could capitalize on current market conditions.',
    0.89,
    'pending',
    false
  );

-- 6. Create market alerts for test user
INSERT INTO public.goal_market_alerts (user_id, goal_id, alert_type, severity, market_data, alert_message, action_items, status)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  cg.id,
  'demand_spike',
  'high',
  '{"field": "machine_learning", "growth_rate": 23.4, "salary_increase": 15000, "job_postings_increase": 67}'::jsonb,
  'Machine Learning Engineer demand surged 23.4% this month with average salary increase of $15K',
  '["accelerate_skill_development", "apply_for_positions", "update_resume_keywords"]'::jsonb,
  'active'
FROM career_goals cg 
WHERE cg.user_id = '00000000-0000-0000-0000-000000000001'::uuid
AND cg.active = true
LIMIT 1

UNION ALL

SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  cg.id,
  'skill_obsolescence',
  'medium',
  '{"skill": "traditional_analytics", "decline_rate": -12, "replacement_skills": ["ml_analytics", "ai_insights"]}'::jsonb,
  'Traditional analytics skills declining 12%. Focus on ML-powered analytics for future-proofing',
  '["upskill_ml_analytics", "learn_ai_tools", "practice_ml_projects"]'::jsonb,
  'active'
FROM career_goals cg 
WHERE cg.user_id = '00000000-0000-0000-0000-000000000001'::uuid
AND cg.active = true
LIMIT 1;

-- 7. Create additional career monitoring alerts
INSERT INTO public.career_monitoring_alerts (user_id, title, description, alert_type, category, severity, trigger_data, recommended_actions, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Market Opportunity: Remote ML Roles',
    'Significant increase in remote Machine Learning Engineer positions with competitive salaries',
    'market_opportunity',
    'career_advancement',
    'high',
    '{"remote_positions_increase": 45, "avg_salary_boost": 18000, "top_companies": ["TechCorp", "DataInc", "AIStudio"]}'::jsonb,
    '[{"action": "update_resume", "priority": "high"}, {"action": "apply_positions", "priority": "medium"}, {"action": "network_companies", "priority": "medium"}]'::jsonb,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Skill Development: PyTorch Trending',
    'PyTorch skills showing strong market demand - 67% increase in job requirements',
    'skill_alert',
    'skill_development',
    'medium',
    '{"skill": "pytorch", "demand_increase": 67, "difficulty": "intermediate", "learning_time_weeks": 8}'::jsonb,
    '[{"action": "enroll_pytorch_course", "priority": "high"}, {"action": "build_pytorch_project", "priority": "medium"}]'::jsonb,
    'active'
  );

-- 8. Update autonomous workflow progress based on completed steps
UPDATE public.autonomous_workflows 
SET 
  progress_percentage = 65,
  last_action_at = now(),
  updated_at = now()
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
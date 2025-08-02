-- Create workflow_steps table without user_id column (workflow_id already references user)
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.autonomous_workflows(id),
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

-- Create RLS policy that checks user through workflow
CREATE POLICY "Users can view their own workflow steps" 
ON public.workflow_steps FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM autonomous_workflows aw 
    WHERE aw.id = workflow_steps.workflow_id 
    AND aw.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all workflow steps" 
ON public.workflow_steps FOR ALL 
USING (true);

-- Insert workflow steps for existing workflow
INSERT INTO public.workflow_steps (workflow_id, step_name, step_type, step_order, status, input_data, output_data, confidence_score, started_at, completed_at)
VALUES 
  (
    (SELECT id FROM autonomous_workflows WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1),
    'Market Analysis',
    'analysis',
    1,
    'completed',
    '{"market_focus": "machine_learning", "location": "global"}'::jsonb,
    '{"demand_score": 92, "growth_rate": 15.3, "salary_trend": "increasing"}'::jsonb,
    0.94,
    now() - interval '2 days',
    now() - interval '2 days' + interval '45 minutes'
  ),
  (
    (SELECT id FROM autonomous_workflows WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1),
    'Skill Gap Assessment',
    'assessment',
    2,
    'completed',
    '{"current_skills": ["python", "data_analysis"], "target_skills": ["machine_learning", "deep_learning"]}'::jsonb,
    '{"gap_score": 67, "priority_skills": ["tensorflow", "pytorch", "ml_ops"], "estimated_hours": 120}'::jsonb,
    0.89,
    now() - interval '2 days' + interval '1 hour',
    now() - interval '1 day' + interval '30 minutes'
  ),
  (
    (SELECT id FROM autonomous_workflows WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1),
    'Learning Path Generation',
    'generation',
    3,
    'in_progress',
    '{"gap_analysis": {"priority_skills": ["tensorflow", "pytorch", "ml_ops"]}, "timeline_weeks": 12}'::jsonb,
    '{"courses_identified": 8, "certification_paths": 3, "project_recommendations": 5}'::jsonb,
    0.91,
    now() - interval '1 day',
    NULL
  );

-- Create Maya decisions for test user
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
  );

-- Update autonomous workflow progress
UPDATE public.autonomous_workflows 
SET 
  progress_percentage = 65,
  last_action_at = now(),
  updated_at = now()
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
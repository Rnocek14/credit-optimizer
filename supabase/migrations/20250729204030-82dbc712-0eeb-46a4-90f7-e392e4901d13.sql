-- Create workflow templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'career_development',
  target_personas JSONB DEFAULT '[]'::jsonb,
  estimated_duration_days INTEGER DEFAULT 30,
  success_rate NUMERIC DEFAULT 0.8,
  template_steps TEXT[] DEFAULT '{}',
  required_context JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create workflow_steps table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.autonomous_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'action',
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_autonomous BOOLEAN DEFAULT true,
  requires_user_input BOOLEAN DEFAULT false,
  estimated_duration_hours INTEGER DEFAULT 1,
  action_config JSONB DEFAULT '{}'::jsonb,
  execution_result JSONB,
  error_message TEXT,
  dependencies UUID[],
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workflow_templates
CREATE POLICY "Anyone can view active workflow templates"
ON public.workflow_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Service role can manage workflow templates"
ON public.workflow_templates FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for workflow_steps
CREATE POLICY "Users can view steps in their own workflows"
ON public.workflow_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.autonomous_workflows 
    WHERE autonomous_workflows.id = workflow_steps.workflow_id 
    AND autonomous_workflows.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all workflow steps"
ON public.workflow_steps FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default workflow templates
INSERT INTO public.workflow_templates (template_name, title, description, category, template_steps, estimated_duration_days, success_rate)
VALUES 
(
  'senior_product_manager_transition',
  'Transition to Senior Product Manager',
  'Complete autonomous workflow to transition from current role to Senior Product Manager within 3 months',
  'career_transition',
  ARRAY[
    'market_analysis',
    'skill_gap_analysis', 
    'create_goal',
    'set_alert',
    'learning_plan_creation',
    'save_course',
    'update_resume'
  ],
  90,
  0.85
),
(
  'data_analyst_roadmap',
  'Data Analyst Career Roadmap',
  'Comprehensive 12-month plan to become a data analyst from entry level',
  'career_development',
  ARRAY[
    'skill_gap_analysis',
    'learning_plan_creation',
    'save_course',
    'create_goal',
    'market_analysis',
    'set_alert'
  ],
  365,
  0.78
),
(
  'tech_skill_development',
  'Technology Skills Development',
  'Focused skill development plan for advancing technical capabilities',
  'skill_development',
  ARRAY[
    'skill_gap_analysis',
    'learning_plan_creation',
    'save_course',
    'create_goal'
  ],
  60,
  0.92
)
ON CONFLICT (template_name) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  template_steps = EXCLUDED.template_steps,
  updated_at = now();
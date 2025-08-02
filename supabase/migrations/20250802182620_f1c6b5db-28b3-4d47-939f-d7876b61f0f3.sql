-- Phase 5 Preparation: Enhanced Data Seeding and System Improvements (Fixed)

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
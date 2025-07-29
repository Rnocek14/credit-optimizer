-- Phase 5: Autonomous Workflow Engine Database Schema

-- Core workflow definitions table
CREATE TABLE public.autonomous_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workflow_type TEXT NOT NULL, -- 'career_transition', 'skill_building', 'job_search', etc.
  title TEXT NOT NULL,
  description TEXT,
  target_outcome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning', -- 'planning', 'active', 'paused', 'completed', 'failed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  estimated_duration_days INTEGER,
  target_completion_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  context_data JSONB NOT NULL DEFAULT '{}', -- User context when workflow was created
  config JSONB NOT NULL DEFAULT '{}', -- Workflow-specific configuration
  progress_percentage INTEGER DEFAULT 0,
  last_action_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual workflow steps/actions
CREATE TABLE public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.autonomous_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- 'analysis', 'action', 'wait', 'user_input', 'validation'
  action_type TEXT NOT NULL, -- 'create_goal', 'save_course', 'update_resume', 'set_alert', 'market_analysis'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'skipped'
  is_autonomous BOOLEAN NOT NULL DEFAULT true, -- Can Maya execute without user approval
  requires_user_input BOOLEAN NOT NULL DEFAULT false,
  estimated_duration_hours INTEGER DEFAULT 1,
  action_config JSONB NOT NULL DEFAULT '{}', -- Step-specific configuration
  execution_result JSONB, -- Results from step execution
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  dependencies UUID[], -- Other steps that must complete first
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Background monitoring and alert system
CREATE TABLE public.career_monitoring_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'market_opportunity', 'skill_gap', 'career_risk', 'timing_optimal'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  category TEXT NOT NULL, -- 'market', 'skills', 'goals', 'timing', 'competition'
  trigger_data JSONB NOT NULL DEFAULT '{}', -- What triggered this alert
  recommended_actions JSONB NOT NULL DEFAULT '[]', -- Suggested actions
  auto_create_workflow BOOLEAN DEFAULT false, -- Should Maya auto-create a workflow
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'dismissed', 'actioned'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  actioned_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced conversation context for multi-session awareness
CREATE TABLE public.conversation_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  context_type TEXT NOT NULL, -- 'career_goal', 'current_project', 'market_focus', 'skill_priority'
  context_key TEXT NOT NULL, -- Identifier for this context
  context_value JSONB NOT NULL,
  importance_score NUMERIC DEFAULT 1.0, -- How important this context is (0-1)
  last_referenced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, context_type, context_key)
);

-- Maya's autonomous decision log
CREATE TABLE public.maya_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  decision_type TEXT NOT NULL, -- 'workflow_created', 'action_executed', 'recommendation_made'
  decision_context JSONB NOT NULL, -- What data Maya used to make this decision
  decision_rationale TEXT NOT NULL, -- Maya's reasoning
  confidence_score NUMERIC NOT NULL, -- How confident Maya is (0-1)
  execution_result JSONB, -- What happened when the decision was executed
  user_feedback TEXT, -- User's reaction/feedback
  user_feedback_rating INTEGER, -- 1-5 rating
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  workflow_id UUID REFERENCES public.autonomous_workflows(id),
  step_id UUID REFERENCES public.workflow_steps(id)
);

-- Workflow templates for common career patterns
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'career_change', 'skill_building', 'job_search', 'promotion'
  target_personas JSONB NOT NULL DEFAULT '[]', -- Who this template is for
  estimated_duration_days INTEGER,
  success_rate NUMERIC DEFAULT 0.0, -- Historical success rate
  template_steps JSONB NOT NULL, -- Step definitions
  required_context JSONB NOT NULL DEFAULT '[]', -- What data Maya needs to customize this
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0
);

-- Enable RLS on all tables
ALTER TABLE public.autonomous_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maya_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflows
CREATE POLICY "Users can manage their own workflows" ON public.autonomous_workflows
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all workflows" ON public.autonomous_workflows
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for workflow steps
CREATE POLICY "Users can view steps for their workflows" ON public.workflow_steps
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.autonomous_workflows 
    WHERE id = workflow_steps.workflow_id AND user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage all workflow steps" ON public.workflow_steps
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for monitoring alerts
CREATE POLICY "Users can manage their own monitoring alerts" ON public.career_monitoring_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all monitoring alerts" ON public.career_monitoring_alerts
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for conversation context
CREATE POLICY "Users can manage their own conversation context" ON public.conversation_context
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all conversation context" ON public.conversation_context
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Maya decisions
CREATE POLICY "Users can view their own Maya decisions" ON public.maya_decisions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all Maya decisions" ON public.maya_decisions
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for workflow templates
CREATE POLICY "Anyone can view active workflow templates" ON public.workflow_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage workflow templates" ON public.workflow_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_autonomous_workflows_user_status ON public.autonomous_workflows(user_id, status);
CREATE INDEX idx_autonomous_workflows_updated_at ON public.autonomous_workflows(updated_at);
CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_status ON public.workflow_steps(status);
CREATE INDEX idx_career_monitoring_alerts_user_status ON public.career_monitoring_alerts(user_id, status);
CREATE INDEX idx_conversation_context_user_type ON public.conversation_context(user_id, context_type);
CREATE INDEX idx_maya_decisions_user_created ON public.maya_decisions(user_id, created_at);

-- Create update triggers
CREATE TRIGGER update_autonomous_workflows_updated_at
  BEFORE UPDATE ON public.autonomous_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at
  BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial workflow templates
INSERT INTO public.workflow_templates (template_name, title, description, category, estimated_duration_days, template_steps, required_context) VALUES
('career_transition_tech', 'Transition to Tech Career', 'Complete workflow for transitioning from non-tech to tech career', 'career_change', 90, 
 '["market_analysis", "skill_gap_analysis", "learning_plan_creation", "portfolio_building", "network_building", "job_application_strategy"]'::jsonb,
 '["current_background", "target_role", "location", "timeline"]'::jsonb),
('skill_advancement', 'Advanced Skill Development', 'Systematic approach to advancing existing skills to senior level', 'skill_building', 60,
 '["current_skill_assessment", "market_demand_analysis", "learning_resource_curation", "practice_project_planning", "certification_pathway"]'::jsonb,
 '["current_skills", "target_level", "specialization_area"]'::jsonb),
('promotion_preparation', 'Promotion Readiness Program', 'Comprehensive preparation for career advancement', 'promotion', 45,
 '["performance_gap_analysis", "leadership_skill_development", "visibility_strategy", "mentor_engagement", "promotion_case_building"]'::jsonb,
 '["current_role", "target_role", "company_context"]'::jsonb);
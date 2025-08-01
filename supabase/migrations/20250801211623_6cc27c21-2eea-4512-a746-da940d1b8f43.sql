-- Phase 3: Advanced AI-Driven Goal Intelligence & Automation
-- Create tables for goal intelligence, learning paths, and autonomous workflows

-- Goal Intelligence Tracking
CREATE TABLE IF NOT EXISTS public.goal_intelligence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  market_score NUMERIC DEFAULT 0,
  difficulty_score NUMERIC DEFAULT 0,
  success_probability NUMERIC DEFAULT 0,
  recommended_timeline_weeks INTEGER DEFAULT 12,
  skill_gap_analysis JSONB DEFAULT '{}',
  market_trends JSONB DEFAULT '{}',
  ai_insights JSONB DEFAULT '{}',
  last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Learning Path Recommendations
CREATE TABLE IF NOT EXISTS public.goal_learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  path_type TEXT NOT NULL DEFAULT 'primary', -- 'primary', 'alternative', 'accelerated'
  path_nodes JSONB NOT NULL DEFAULT '[]',
  estimated_completion_weeks INTEGER DEFAULT 12,
  cost_estimate NUMERIC DEFAULT 0,
  difficulty_level INTEGER DEFAULT 1,
  success_rate NUMERIC DEFAULT 0.8,
  personalization_score NUMERIC DEFAULT 0.5,
  market_alignment_score NUMERIC DEFAULT 0.5,
  generated_by TEXT DEFAULT 'ai_planner',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goal Market Alerts
CREATE TABLE IF NOT EXISTS public.goal_market_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'demand_increase', 'demand_decrease', 'salary_change', 'skill_trend'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  market_data JSONB DEFAULT '{}',
  recommended_actions JSONB DEFAULT '[]',
  auto_workflow_created BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goal Autonomous Actions Log
CREATE TABLE IF NOT EXISTS public.goal_autonomous_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'priority_adjustment', 'timeline_update', 'path_optimization', 'alert_creation'
  action_description TEXT NOT NULL,
  previous_state JSONB DEFAULT '{}',
  new_state JSONB DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0.8,
  user_approved BOOLEAN,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goal Collaboration
CREATE TABLE IF NOT EXISTS public.goal_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  collaborator_user_id UUID NOT NULL,
  collaboration_type TEXT NOT NULL DEFAULT 'mentor', -- 'mentor', 'peer', 'study_buddy'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled'
  permissions JSONB DEFAULT '{"view": true, "comment": false, "edit": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(goal_id, collaborator_user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.goal_intelligence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_market_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_autonomous_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_collaborations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_intelligence_cache
CREATE POLICY "Users can view their own goal intelligence" ON public.goal_intelligence_cache
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all goal intelligence" ON public.goal_intelligence_cache
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for goal_learning_paths
CREATE POLICY "Users can view their own learning paths" ON public.goal_learning_paths
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all learning paths" ON public.goal_learning_paths
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for goal_market_alerts
CREATE POLICY "Users can view their own goal alerts" ON public.goal_market_alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own goal alerts" ON public.goal_market_alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all goal alerts" ON public.goal_market_alerts
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for goal_autonomous_actions
CREATE POLICY "Users can view their own autonomous actions" ON public.goal_autonomous_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can approve their own autonomous actions" ON public.goal_autonomous_actions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all autonomous actions" ON public.goal_autonomous_actions
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for goal_collaborations
CREATE POLICY "Users can view collaborations they own or participate in" ON public.goal_collaborations
  FOR SELECT USING (auth.uid() = owner_user_id OR auth.uid() = collaborator_user_id);
CREATE POLICY "Users can manage collaborations they own" ON public.goal_collaborations
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Service role can manage all collaborations" ON public.goal_collaborations
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_intelligence_cache_goal_id ON public.goal_intelligence_cache(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_intelligence_cache_user_id ON public.goal_intelligence_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_learning_paths_goal_id ON public.goal_learning_paths(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_learning_paths_user_id ON public.goal_learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_market_alerts_goal_id ON public.goal_market_alerts(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_market_alerts_user_id ON public.goal_market_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_autonomous_actions_goal_id ON public.goal_autonomous_actions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_autonomous_actions_user_id ON public.goal_autonomous_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_collaborations_goal_id ON public.goal_collaborations(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_collaborations_owner ON public.goal_collaborations(owner_user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_goal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goal_intelligence_cache_updated_at
  BEFORE UPDATE ON public.goal_intelligence_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_updated_at();

CREATE TRIGGER update_goal_learning_paths_updated_at
  BEFORE UPDATE ON public.goal_learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_updated_at();

CREATE TRIGGER update_goal_collaborations_updated_at
  BEFORE UPDATE ON public.goal_collaborations
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_updated_at();
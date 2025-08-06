-- Phase 3.1: Real-Time Engagement Foundation Database Schema

-- Learning engagement sessions table for real session tracking
CREATE TABLE public.learning_engagement_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID,
  session_type TEXT NOT NULL DEFAULT 'learning', -- learning, practice, review
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  activity_data JSONB NOT NULL DEFAULT '{}', -- clicks, pauses, navigation
  engagement_score NUMERIC DEFAULT 0.0, -- 0-1 calculated score
  difficulty_feedback INTEGER, -- 1-5 scale
  completion_percentage INTEGER DEFAULT 0,
  focus_events JSONB DEFAULT '[]', -- tab switches, breaks, etc
  learning_velocity NUMERIC DEFAULT 0.0, -- concepts per minute
  retention_indicators JSONB DEFAULT '{}', -- quiz scores, repeat views
  session_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Motivation interventions for Maya's proactive suggestions
CREATE TABLE public.motivation_interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  intervention_type TEXT NOT NULL, -- break_suggestion, difficulty_adjustment, pacing_change
  trigger_conditions JSONB NOT NULL, -- what caused this intervention
  intervention_data JSONB NOT NULL, -- suggested action details
  confidence_score NUMERIC DEFAULT 0.0,
  suggested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_response TEXT, -- accepted, dismissed, modified
  response_at TIMESTAMP WITH TIME ZONE,
  effectiveness_score NUMERIC, -- measured outcome improvement
  implementation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gamification metrics for user motivation scoring
CREATE TABLE public.gamification_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- streak_days, completion_rate, engagement_trend
  metric_value NUMERIC NOT NULL,
  measurement_period TEXT NOT NULL, -- daily, weekly, monthly
  measurement_date DATE NOT NULL DEFAULT current_date,
  context_data JSONB DEFAULT '{}', -- additional context about the metric
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced Maya feedback correlation table
CREATE TABLE public.maya_feedback_correlations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL, -- intervention, recommendation, alert
  feedback_data JSONB NOT NULL, -- original feedback/recommendation
  user_action TEXT, -- what user did after feedback
  outcome_metrics JSONB DEFAULT '{}', -- measured results
  correlation_score NUMERIC DEFAULT 0.0, -- how well feedback predicted outcome
  feedback_effectiveness NUMERIC DEFAULT 0.0, -- 0-1 score
  time_to_action_hours NUMERIC, -- how long until user acted
  long_term_impact JSONB DEFAULT '{}', -- lasting effects over time
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_learning_sessions_user_time ON public.learning_engagement_sessions(user_id, started_at DESC);
CREATE INDEX idx_motivation_interventions_user ON public.motivation_interventions(user_id, suggested_at DESC);
CREATE INDEX idx_gamification_metrics_user_type ON public.gamification_metrics(user_id, metric_type, measurement_date DESC);
CREATE INDEX idx_maya_feedback_user_type ON public.maya_feedback_correlations(user_id, feedback_type, created_at DESC);

-- RLS Policies
ALTER TABLE public.learning_engagement_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivation_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maya_feedback_correlations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own data
CREATE POLICY "Users can manage their own learning sessions" ON public.learning_engagement_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own motivation interventions" ON public.motivation_interventions
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can respond to their own interventions" ON public.motivation_interventions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own gamification metrics" ON public.gamification_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own Maya feedback correlations" ON public.maya_feedback_correlations
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all data
CREATE POLICY "Service role can manage all learning sessions" ON public.learning_engagement_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all motivation interventions" ON public.motivation_interventions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all gamification metrics" ON public.gamification_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all Maya feedback correlations" ON public.maya_feedback_correlations
  FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_learning_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learning_sessions_updated_at
  BEFORE UPDATE ON public.learning_engagement_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_learning_sessions_updated_at();
-- Create missing tables for Phase 4

-- Predictive analysis results table
CREATE TABLE public.predictive_analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  success_probability NUMERIC NOT NULL DEFAULT 0.0,
  uplift_estimate NUMERIC NOT NULL DEFAULT 0.0,
  path_deviation NUMERIC NOT NULL DEFAULT 0.0,
  analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.predictive_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies for predictive analysis
CREATE POLICY "Users can view their own predictive analysis" 
ON public.predictive_analysis_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all predictive analysis" 
ON public.predictive_analysis_results 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Market pulse data table
CREATE TABLE public.market_pulse_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  trend_direction TEXT NOT NULL DEFAULT 'stable',
  confidence_score NUMERIC NOT NULL DEFAULT 0.8,
  data_source TEXT NOT NULL DEFAULT 'market_aggregator',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_pulse_data ENABLE ROW LEVEL SECURITY;

-- Create policies for market pulse data
CREATE POLICY "Anyone can view market pulse data" 
ON public.market_pulse_data 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage market pulse data" 
ON public.market_pulse_data 
FOR ALL 
USING (true)
WITH CHECK (true);

-- User CRI goals table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_cri_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_cri NUMERIC NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_cri_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for CRI goals
CREATE POLICY "Users can manage their own CRI goals" 
ON public.user_cri_goals 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all CRI goals" 
ON public.user_cri_goals 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Initialize test user data
-- Create CRI goal for test user
INSERT INTO public.user_cri_goals (user_id, target_cri) 
VALUES ('00000000-0000-0000-0000-000000000001', 85)
ON CONFLICT (user_id) DO NOTHING;

-- Create sample autonomous workflows for test user
INSERT INTO public.autonomous_workflows (
  user_id, title, description, workflow_type, target_outcome, status, priority, progress_percentage, config, context_data
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'AI-Driven Skill Development Plan',
  'Automated learning path optimization based on market trends and personal goals',
  'skill_development',
  'Achieve 85% CRI score through targeted skill acquisition',
  'active',
  'high',
  35,
  '{"auto_approve": false, "notification_threshold": 0.8}'::jsonb,
  '{"target_skills": ["machine_learning", "data_analysis"], "timeline_weeks": 12}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000001',
  'Market Intelligence Monitoring',
  'Continuous monitoring of job market trends for career optimization',
  'market_monitoring',
  'Stay ahead of market changes with 95% accuracy predictions',
  'active',
  'medium',
  60,
  '{"check_frequency": "daily", "alert_threshold": 0.7}'::jsonb,
  '{"monitored_roles": ["data_scientist", "ml_engineer"], "location": "San Francisco"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000001',
  'Automated Goal Adjustment',
  'AI-powered goal refinement based on progress and market conditions',
  'goal_optimization',
  'Maintain optimal goal alignment with 90% success probability',
  'planning',
  'high',
  15,
  '{"optimization_frequency": "weekly", "confidence_threshold": 0.85}'::jsonb,
  '{"current_goals": 3, "adjustment_history": []}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Create sample Maya decisions for test user
INSERT INTO public.maya_decisions (
  user_id, decision_type, decision_data, confidence_score, rationale, status, execution_result
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'skill_prioritization',
  '{"recommended_skill": "machine_learning", "priority_score": 9.2, "market_demand": "high"}'::jsonb,
  0.89,
  'Based on current market trends and user profile, ML skills show highest ROI potential',
  'approved',
  '{"skill_added": true, "learning_path_created": true}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000001',
  'goal_timeline_adjustment',
  '{"goal_id": "goal_123", "new_timeline": "8_weeks", "reason": "accelerated_path_available"}'::jsonb,
  0.92,
  'New accelerated learning path identified with 95% success rate',
  'pending',
  '{}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000001',
  'market_opportunity_alert',
  '{"opportunity": "senior_data_scientist", "urgency": "high", "match_score": 0.87}'::jsonb,
  0.85,
  'Significant market opportunity detected matching user skills and goals',
  'approved',
  '{"alert_created": true, "workflow_triggered": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Create sample predictive analysis results
INSERT INTO public.predictive_analysis_results (
  user_id, career_path, location, success_probability, uplift_estimate, path_deviation, analysis_data
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'Data Scientist',
  'San Francisco',
  0.87,
  0.23,
  0.12,
  '{"skill_gaps": ["advanced_ml", "deployment"], "market_score": 8.5, "timeline_prediction": "6_months"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000001',
  'ML Engineer',
  'San Francisco',
  0.92,
  0.31,
  0.08,
  '{"skill_gaps": ["mlops", "cloud_platforms"], "market_score": 9.1, "timeline_prediction": "4_months"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Create sample market pulse data
INSERT INTO public.market_pulse_data (
  career_path, location, metric_type, metric_value, trend_direction, confidence_score
) VALUES 
('Data Scientist', 'San Francisco', 'demand_score', 8.7, 'increasing', 0.91),
('Data Scientist', 'San Francisco', 'competition_level', 7.2, 'stable', 0.85),
('Data Scientist', 'San Francisco', 'salary_trend', 145000, 'increasing', 0.88),
('ML Engineer', 'San Francisco', 'demand_score', 9.1, 'increasing', 0.93),
('ML Engineer', 'San Francisco', 'competition_level', 6.8, 'decreasing', 0.87),
('ML Engineer', 'San Francisco', 'salary_trend', 160000, 'increasing', 0.92),
('Software Engineer', 'San Francisco', 'demand_score', 8.9, 'stable', 0.89),
('Software Engineer', 'San Francisco', 'competition_level', 7.5, 'increasing', 0.84),
('Software Engineer', 'San Francisco', 'salary_trend', 135000, 'stable', 0.86)
ON CONFLICT (id) DO NOTHING;
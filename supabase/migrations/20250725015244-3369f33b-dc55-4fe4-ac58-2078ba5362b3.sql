-- Fix function search_path security warnings by adding proper search_path settings
-- This addresses the 3 function search path mutable warnings

-- Update existing functions to have proper search_path
ALTER FUNCTION public.suggest_badges_for_user(uuid) SET search_path TO 'public', 'auth';
ALTER FUNCTION public.get_user_level(uuid) SET search_path TO 'public', 'auth';
ALTER FUNCTION public.get_user_role(uuid) SET search_path TO 'public', 'auth';
ALTER FUNCTION public.get_badge_for_user(text, uuid) SET search_path TO 'public', 'auth';
ALTER FUNCTION public.calculate_career_step_levels(uuid) SET search_path TO 'public';
ALTER FUNCTION public.refresh_career_steps_with_levels() SET search_path TO 'public';
ALTER FUNCTION public.award_xp(uuid, integer, text, text, uuid) SET search_path TO 'public', 'auth';
ALTER FUNCTION public.get_demo_resume_profiles() SET search_path TO 'public', 'auth';
ALTER FUNCTION public.generate_user_roadmap(uuid) SET search_path TO 'public', 'auth';

-- Create historical market trends table for time-series tracking
CREATE TABLE IF NOT EXISTS public.market_trends_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_trend_id UUID NOT NULL,
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  job_postings_count INTEGER DEFAULT 0,
  average_salary NUMERIC DEFAULT 0,
  growth_rate NUMERIC DEFAULT 0,
  demand_score NUMERIC DEFAULT 0,
  competition_level TEXT DEFAULT 'medium',
  data_source TEXT DEFAULT 'ai_analysis',
  time_period TEXT DEFAULT '30d',
  raw_data JSONB DEFAULT '{}',
  ai_insights JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.market_trends_history ENABLE ROW LEVEL SECURITY;

-- Create policy for historical data
CREATE POLICY "Anyone can view market trends history" 
ON public.market_trends_history 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage market trends history" 
ON public.market_trends_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_trends_history_career_location ON public.market_trends_history(career_path, location);
CREATE INDEX IF NOT EXISTS idx_market_trends_history_recorded_at ON public.market_trends_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_market_trends_created_at ON public.market_trends(created_at);
CREATE INDEX IF NOT EXISTS idx_market_trends_career_location ON public.market_trends(career_path, location);

-- Create user market preferences table for personalization
CREATE TABLE IF NOT EXISTS public.user_market_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preferred_careers TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  salary_range_min INTEGER DEFAULT 0,
  salary_range_max INTEGER DEFAULT 0,
  alert_enabled BOOLEAN DEFAULT false,
  alert_frequency TEXT DEFAULT 'weekly',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_market_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user preferences
CREATE POLICY "Users can manage their own market preferences" 
ON public.user_market_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage market preferences" 
ON public.user_market_preferences 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create market alerts table
CREATE TABLE IF NOT EXISTS public.market_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'salary_change', 'demand_shift', 'new_opportunities'
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  threshold_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  previous_value NUMERIC DEFAULT 0,
  alert_message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for alerts
CREATE POLICY "Users can view their own market alerts" 
ON public.market_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own market alerts" 
ON public.market_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage market alerts" 
ON public.market_alerts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_user_market_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_market_preferences_updated_at
  BEFORE UPDATE ON public.user_market_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_market_preferences_updated_at();
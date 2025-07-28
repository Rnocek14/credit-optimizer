-- Create predictive_analysis_results table for storing AI predictions
CREATE TABLE IF NOT EXISTS public.predictive_analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  time_horizon TEXT NOT NULL DEFAULT '12months',
  predictions JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accuracy_score NUMERIC DEFAULT 0.7,
  confidence_score NUMERIC DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.predictive_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies for predictive_analysis_results
CREATE POLICY "Anyone can view predictive analysis results" 
ON public.predictive_analysis_results 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage predictive analysis results" 
ON public.predictive_analysis_results 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_predictive_analysis_career_location 
ON public.predictive_analysis_results(career_path, location);

-- Add index for recent data queries
CREATE INDEX IF NOT EXISTS idx_predictive_analysis_generated_at 
ON public.predictive_analysis_results(generated_at DESC);

-- Seed some sample market trends data for testing
INSERT INTO public.market_trends (career_path, location, job_postings_count, average_salary, growth_rate, demand_score, competition_level, data_source, time_period, raw_data, ai_insights, created_at, updated_at) 
VALUES 
  ('Software Engineer', 'california', 2450, 145000, 12.5, 95, 'high', 'ai_analysis', '30d', 
   '{"skills": ["React", "Python", "AWS"], "companies": ["Google", "Meta", "Apple"]}', 
   '{"growthRate": 12.5, "demandTrend": "increasing", "salaryTrend": "rising", "marketSaturation": "medium"}',
   now(), now()),
  ('Data Scientist', 'new york', 1850, 138000, 15.2, 92, 'high', 'ai_analysis', '30d',
   '{"skills": ["Python", "Machine Learning", "SQL"], "companies": ["Goldman Sachs", "JPMorgan", "Bloomberg"]}',
   '{"growthRate": 15.2, "demandTrend": "increasing", "salaryTrend": "rising", "marketSaturation": "low"}',
   now(), now()),
  ('UX Designer', 'california', 980, 112000, 8.7, 88, 'medium', 'ai_analysis', '30d',
   '{"skills": ["Figma", "User Research", "Prototyping"], "companies": ["Adobe", "Spotify", "Airbnb"]}',
   '{"growthRate": 8.7, "demandTrend": "stable", "salaryTrend": "rising", "marketSaturation": "medium"}',
   now(), now())
ON CONFLICT DO NOTHING;
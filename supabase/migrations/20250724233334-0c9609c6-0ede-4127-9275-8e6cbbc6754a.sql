-- Create market trends table for real-time job market data
CREATE TABLE public.market_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT valid_competition_level CHECK (competition_level IN ('low', 'medium', 'high')),
  CONSTRAINT valid_demand_score CHECK (demand_score >= 0 AND demand_score <= 100),
  CONSTRAINT valid_growth_rate CHECK (growth_rate >= -100 AND growth_rate <= 100)
);

-- Enable RLS
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;

-- Create policies for market trends
CREATE POLICY "Anyone can view market trends" 
ON public.market_trends 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage market trends" 
ON public.market_trends 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_market_trends_career_location ON public.market_trends(career_path, location);
CREATE INDEX idx_market_trends_created_at ON public.market_trends(created_at DESC);
CREATE INDEX idx_market_trends_demand_score ON public.market_trends(demand_score DESC);

-- Create updated_at trigger
CREATE TRIGGER update_market_trends_updated_at
BEFORE UPDATE ON public.market_trends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create performance optimization table for cached AI operations
CREATE TABLE public.ai_operation_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL,
  input_hash TEXT NOT NULL UNIQUE,
  result_data JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Enable RLS for cache
ALTER TABLE public.ai_operation_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for AI cache
CREATE POLICY "Service role can manage AI cache" 
ON public.ai_operation_cache 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for cache performance
CREATE INDEX idx_ai_cache_input_hash ON public.ai_operation_cache(input_hash);
CREATE INDEX idx_ai_cache_operation_type ON public.ai_operation_cache(operation_type);
CREATE INDEX idx_ai_cache_expires_at ON public.ai_operation_cache(expires_at);

-- Insert some sample market trend data for testing
INSERT INTO public.market_trends (career_path, location, job_postings_count, average_salary, growth_rate, demand_score, competition_level, data_source) VALUES
('Software Developer', 'San Francisco', 2500, 145000, 12.5, 85, 'high', 'market_analysis'),
('Data Scientist', 'New York', 1800, 125000, 15.2, 90, 'high', 'market_analysis'),
('Product Manager', 'Seattle', 1200, 135000, 8.7, 75, 'medium', 'market_analysis'),
('UX Designer', 'Austin', 800, 95000, 6.3, 70, 'medium', 'market_analysis'),
('DevOps Engineer', 'Remote', 1500, 115000, 18.9, 95, 'low', 'market_analysis');
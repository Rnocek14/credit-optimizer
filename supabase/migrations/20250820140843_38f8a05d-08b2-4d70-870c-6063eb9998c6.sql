-- Create app_config table for tunable constants
CREATE TABLE public.app_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view app config" 
ON public.app_config 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage app config" 
ON public.app_config 
FOR ALL 
USING (true);

-- Create salary_benchmarks table
CREATE TABLE public.salary_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  region TEXT NOT NULL,
  salary_min INTEGER NOT NULL DEFAULT 0,
  salary_mid INTEGER NOT NULL DEFAULT 0,
  salary_max INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  demand_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, region)
);

-- Enable RLS
ALTER TABLE public.salary_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view salary benchmarks" 
ON public.salary_benchmarks 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage salary benchmarks" 
ON public.salary_benchmarks 
FOR ALL 
USING (true);

-- Create col_index table (Cost of Living Index)
CREATE TABLE public.col_index (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL UNIQUE,
  col_index NUMERIC NOT NULL DEFAULT 100.0,
  housing_index NUMERIC NOT NULL DEFAULT 100.0,
  groceries_index NUMERIC NOT NULL DEFAULT 100.0,
  transport_index NUMERIC NOT NULL DEFAULT 100.0,
  visa_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.col_index ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view col index" 
ON public.col_index 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage col index" 
ON public.col_index 
FOR ALL 
USING (true);

-- Insert default app configuration
INSERT INTO public.app_config (config_key, config_value, description) VALUES
('switching', jsonb_build_object(
  'BASE_TRANSITION_HOURS', 2000,
  'BASE_DIRECT_COST', 15000,
  'FRICTION_BASE', 5000,
  'OPPORTUNITY_COST', 50000,
  'DEFAULT_CURRENT_SALARY', 75000,
  'DEFAULT_TARGET_SALARY', 90000,
  'AGE_PENALTY_CAP', 1.5,
  'RISK_WEIGHTS', jsonb_build_object(
    'ai_risk', 0.3,
    'switch_risk', 0.25,
    'volatility', 0.25,
    'cri_mismatch', 0.2
  )
), 'Configuration constants for career switching calculations');

-- Insert sample salary benchmarks
INSERT INTO public.salary_benchmarks (role, region, salary_min, salary_mid, salary_max, demand_multiplier) VALUES
('Software Engineer', 'US-SF', 120000, 180000, 250000, 1.3),
('Software Engineer', 'US-NYC', 110000, 160000, 220000, 1.2),
('Software Engineer', 'US-CHI', 85000, 120000, 160000, 1.0),
('Software Engineer', 'US-AUS', 90000, 130000, 170000, 1.1),
('Data Scientist', 'US-SF', 130000, 190000, 260000, 1.4),
('Data Scientist', 'US-NYC', 120000, 170000, 230000, 1.3),
('Data Scientist', 'US-CHI', 95000, 135000, 180000, 1.1),
('Product Manager', 'US-SF', 140000, 200000, 280000, 1.3),
('Product Manager', 'US-NYC', 130000, 185000, 250000, 1.2),
('UX Designer', 'US-SF', 100000, 145000, 190000, 1.2),
('UX Designer', 'US-NYC', 95000, 135000, 175000, 1.1),
('DevOps Engineer', 'US-SF', 125000, 175000, 230000, 1.3),
('DevOps Engineer', 'US-CHI', 90000, 125000, 165000, 1.0),
('Software Engineer', 'UK-LON', 45000, 65000, 90000, 1.1),
('Data Scientist', 'UK-LON', 50000, 75000, 100000, 1.2);

-- Insert cost of living index data
INSERT INTO public.col_index (city, country, region, col_index, housing_index, groceries_index, transport_index, visa_required) VALUES
('San Francisco', 'United States', 'US-SF', 244.0, 376.7, 112.4, 158.2, false),
('New York', 'United States', 'US-NYC', 184.2, 200.5, 116.2, 121.5, false),
('Chicago', 'United States', 'US-CHI', 106.9, 95.1, 102.8, 119.6, false),
('Austin', 'United States', 'US-AUS', 119.3, 125.4, 95.2, 105.8, false),
('London', 'United Kingdom', 'UK-LON', 153.9, 190.2, 89.7, 150.3, true),
('Berlin', 'Germany', 'DE-BER', 118.5, 125.8, 82.4, 119.2, true),
('Toronto', 'Canada', 'CA-TOR', 127.4, 142.6, 98.3, 112.7, false),
('Amsterdam', 'Netherlands', 'NL-AMS', 142.8, 165.3, 93.1, 135.9, true),
('Singapore', 'Singapore', 'SG-SIN', 179.6, 285.4, 98.7, 88.4, true),
('Sydney', 'Australia', 'AU-SYD', 158.7, 189.3, 112.8, 129.5, true);

-- Create update triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_salary_benchmarks_updated_at
  BEFORE UPDATE ON public.salary_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_col_index_updated_at
  BEFORE UPDATE ON public.col_index
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
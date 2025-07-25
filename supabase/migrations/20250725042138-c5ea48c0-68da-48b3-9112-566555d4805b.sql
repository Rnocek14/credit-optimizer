-- Create pattern recognition results table
CREATE TABLE public.pattern_recognition_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'seasonal', 'growth_trend', 'volatility', 'correlation'
  pattern_data JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  anomaly_score NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market correlations table
CREATE TABLE public.market_correlations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path_a TEXT NOT NULL,
  career_path_b TEXT NOT NULL,
  location TEXT NOT NULL,
  correlation_coefficient NUMERIC NOT NULL DEFAULT 0.0,
  correlation_type TEXT NOT NULL, -- 'positive', 'negative', 'neutral'
  strength TEXT NOT NULL, -- 'weak', 'moderate', 'strong'
  time_period TEXT NOT NULL DEFAULT '90d',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create economic indicators table
CREATE TABLE public.economic_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_name TEXT NOT NULL,
  indicator_value NUMERIC NOT NULL,
  location TEXT NOT NULL,
  time_period TEXT NOT NULL,
  data_source TEXT NOT NULL DEFAULT 'external_api',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create anomaly detections table
CREATE TABLE public.anomaly_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  anomaly_type TEXT NOT NULL, -- 'spike', 'drop', 'trend_break', 'volatility'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  anomaly_score NUMERIC NOT NULL DEFAULT 0.0,
  baseline_value NUMERIC,
  current_value NUMERIC,
  deviation_percentage NUMERIC,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pattern_recognition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view pattern recognition results" ON public.pattern_recognition_results FOR SELECT USING (true);
CREATE POLICY "Service role can manage pattern recognition results" ON public.pattern_recognition_results FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view market correlations" ON public.market_correlations FOR SELECT USING (true);
CREATE POLICY "Service role can manage market correlations" ON public.market_correlations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view economic indicators" ON public.economic_indicators FOR SELECT USING (true);
CREATE POLICY "Service role can manage economic indicators" ON public.economic_indicators FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view anomaly detections" ON public.anomaly_detections FOR SELECT USING (true);
CREATE POLICY "Service role can manage anomaly detections" ON public.anomaly_detections FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_pattern_recognition_career_location ON public.pattern_recognition_results(career_path, location);
CREATE INDEX idx_pattern_recognition_type_confidence ON public.pattern_recognition_results(pattern_type, confidence_score);
CREATE INDEX idx_market_correlations_paths ON public.market_correlations(career_path_a, career_path_b, location);
CREATE INDEX idx_economic_indicators_location_time ON public.economic_indicators(location, time_period);
CREATE INDEX idx_anomaly_detections_career_location ON public.anomaly_detections(career_path, location);
CREATE INDEX idx_anomaly_detections_severity_detected ON public.anomaly_detections(severity, detected_at);

-- Create trigger for updated_at
CREATE TRIGGER update_pattern_recognition_results_updated_at
  BEFORE UPDATE ON public.pattern_recognition_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
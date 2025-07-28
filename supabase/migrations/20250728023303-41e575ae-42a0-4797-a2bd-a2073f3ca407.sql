-- Create missing tables for predictive analytics and pattern recognition

-- Create predictive_analysis_results table
CREATE TABLE public.predictive_analysis_results (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    career_path TEXT NOT NULL,
    location TEXT NOT NULL,
    analysis_type TEXT NOT NULL DEFAULT 'demand_forecast',
    prediction_data JSONB NOT NULL DEFAULT '{}',
    confidence_score NUMERIC NOT NULL DEFAULT 0.0,
    prediction_timeframe TEXT NOT NULL DEFAULT '12_months',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    user_id UUID DEFAULT NULL,
    data_sources JSONB DEFAULT '[]',
    accuracy_score NUMERIC DEFAULT NULL
);

-- Enable RLS for predictive_analysis_results
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

CREATE POLICY "Users can create their own predictive analysis results" 
ON public.predictive_analysis_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create updated_at trigger for predictive_analysis_results
CREATE TRIGGER update_predictive_analysis_results_updated_at
BEFORE UPDATE ON public.predictive_analysis_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_predictive_analysis_career_location ON public.predictive_analysis_results(career_path, location);
CREATE INDEX idx_predictive_analysis_expires_at ON public.predictive_analysis_results(expires_at);

-- Insert some sample data for testing
INSERT INTO public.predictive_analysis_results (career_path, location, analysis_type, prediction_data, confidence_score) VALUES
('Software Engineer', 'San Francisco, CA', 'demand_forecast', '{"demand_growth": 15.3, "salary_trend": "increasing", "market_saturation": "medium"}', 92.5),
('Data Scientist', 'New York, NY', 'salary_projection', '{"projected_salary": 125000, "growth_rate": 8.2, "market_demand": "high"}', 88.7),
('Product Manager', 'Seattle, WA', 'market_opportunity', '{"opportunity_score": 89, "competition_level": "high", "entry_barrier": "medium"}', 85.4);
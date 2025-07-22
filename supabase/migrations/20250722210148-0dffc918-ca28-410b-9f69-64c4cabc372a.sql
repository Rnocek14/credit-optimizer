-- Create job_outcomes table
CREATE TABLE IF NOT EXISTS public.job_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  required_skills UUID[],
  preferred_cri INTEGER,
  salary_range TEXT,
  region_availability TEXT[],
  next_path_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_outcomes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view job outcome data"
ON public.job_outcomes
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage job outcome data"
ON public.job_outcomes
FOR ALL
USING (true)
WITH CHECK (true);
-- Create table to store crowdsourced or external salary insights
CREATE TABLE public.salary_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path_id UUID NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('user', 'external', 'admin')),
  reported_salary INTEGER NOT NULL,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('Entry', 'Mid', 'Senior', 'Lead')),
  data_source TEXT, -- e.g., "Glassdoor", "Levels.fyi", "User Submission"
  notes TEXT,
  created_by UUID, -- References auth user but no FK constraint
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view salary insights"
ON public.salary_insights FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own salary insight"
ON public.salary_insights FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Service role can manage all salary insights"
ON public.salary_insights FOR ALL
USING (true)
WITH CHECK (true);
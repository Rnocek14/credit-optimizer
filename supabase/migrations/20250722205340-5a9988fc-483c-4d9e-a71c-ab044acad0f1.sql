-- Create step_equivalents table
CREATE TABLE IF NOT EXISTS public.step_equivalents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID REFERENCES public.career_steps(id) ON DELETE CASCADE,
  equivalent_step_id UUID REFERENCES public.career_steps(id) ON DELETE CASCADE,
  match_reason TEXT,
  cri_difference INTEGER,
  skill_overlap_percentage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(step_id, equivalent_step_id)
);

-- Enable RLS
ALTER TABLE public.step_equivalents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view step equivalency data"
ON public.step_equivalents
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage step equivalency data"
ON public.step_equivalents
FOR ALL
USING (true)
WITH CHECK (true);
-- Create career_step_skills table
CREATE TABLE IF NOT EXISTS public.career_step_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID REFERENCES public.career_steps(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  importance_score INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(step_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.career_step_skills ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view step-skill mappings"
ON public.career_step_skills
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage step-skill mappings"
ON public.career_step_skills
FOR ALL
USING (true)
WITH CHECK (true);
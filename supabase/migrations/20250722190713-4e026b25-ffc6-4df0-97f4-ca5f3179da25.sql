-- Add missing fields to roadmap_steps for career alignment
ALTER TABLE public.roadmap_steps 
ADD COLUMN IF NOT EXISTS career_path_id UUID REFERENCES public.career_paths(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_checkpoint BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_capstone BOOLEAN DEFAULT false;

-- Create roadmap_step_skills junction table to link steps with skills
CREATE TABLE IF NOT EXISTS public.roadmap_step_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_step_id UUID NOT NULL REFERENCES public.roadmap_steps(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(roadmap_step_id, skill_id)
);

-- Enable RLS on the new table
ALTER TABLE public.roadmap_step_skills ENABLE ROW LEVEL SECURITY;

-- Create policies for roadmap_step_skills
CREATE POLICY "Anyone can view roadmap step skills" 
ON public.roadmap_step_skills 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage roadmap step skills" 
ON public.roadmap_step_skills 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Populate roadmap_step_skills based on skill_keywords matching
INSERT INTO public.roadmap_step_skills (roadmap_step_id, skill_id)
SELECT DISTINCT rs.id, s.id
FROM public.roadmap_steps rs
CROSS JOIN public.skills s
WHERE EXISTS (
  SELECT 1 
  FROM unnest(rs.skill_keywords) AS keyword
  WHERE LOWER(s.name) = LOWER(keyword)
     OR LOWER(s.name) LIKE '%' || LOWER(keyword) || '%'
     OR LOWER(keyword) LIKE '%' || LOWER(s.name) || '%'
)
ON CONFLICT (roadmap_step_id, skill_id) DO NOTHING;

-- Mark some roadmap steps as checkpoints and capstones based on keywords
UPDATE public.roadmap_steps 
SET is_checkpoint = true 
WHERE LOWER(title) LIKE '%foundation%' 
   OR LOWER(title) LIKE '%fundamental%'
   OR LOWER(title) LIKE '%basics%'
   OR LOWER(title) LIKE '%introduction%';

UPDATE public.roadmap_steps 
SET is_capstone = true 
WHERE LOWER(title) LIKE '%portfolio%' 
   OR LOWER(title) LIKE '%project%'
   OR LOWER(title) LIKE '%capstone%'
   OR LOWER(title) LIKE '%final%';
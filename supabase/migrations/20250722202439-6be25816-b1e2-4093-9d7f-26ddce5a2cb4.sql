-- Create career_steps table
CREATE TABLE IF NOT EXISTS public.career_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_path_id UUID REFERENCES public.career_paths(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  step_type TEXT CHECK (step_type IN ('education', 'certification', 'skill', 'project', 'job', 'milestone', 'portfolio')),
  estimated_time TEXT,
  estimated_cost TEXT,
  prerequisites UUID[],
  skill_ids UUID[],
  proof_method TEXT,
  substitutions TEXT[],
  linked_job_titles TEXT[],
  is_terminal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.career_steps ENABLE ROW LEVEL SECURITY;

-- Create policies for career_steps
CREATE POLICY "Anyone can view career steps" 
ON public.career_steps 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage career steps" 
ON public.career_steps 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_career_steps_updated_at
BEFORE UPDATE ON public.career_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
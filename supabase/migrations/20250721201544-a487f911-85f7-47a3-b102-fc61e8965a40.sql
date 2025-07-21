-- Create skill_branches table for alternate path pivots, backtracking, and reroutes
CREATE TABLE public.skill_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  to_skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pivot', 'branch', 'backtrack')),
  recommended BOOLEAN NOT NULL DEFAULT false,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.skill_branches ENABLE ROW LEVEL SECURITY;

-- Create policies for skill branches
CREATE POLICY "Anyone can view skill branches" 
ON public.skill_branches 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage skill branches" 
ON public.skill_branches 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_skill_branches_from_skill ON public.skill_branches(from_skill_id);
CREATE INDEX idx_skill_branches_to_skill ON public.skill_branches(to_skill_id);
CREATE INDEX idx_skill_branches_type ON public.skill_branches(type);

-- Insert some sample pivot data
INSERT INTO public.skill_branches (from_skill_id, to_skill_id, type, recommended, reasoning) VALUES
((SELECT id FROM public.skills WHERE name = 'JavaScript' LIMIT 1), (SELECT id FROM public.skills WHERE name = 'Python' LIMIT 1), 'pivot', true, 'Strong foundation in programming fundamentals makes this transition smooth'),
((SELECT id FROM public.skills WHERE name = 'React' LIMIT 1), (SELECT id FROM public.skills WHERE name = 'Vue.js' LIMIT 1), 'pivot', true, 'Component-based architecture knowledge transfers well'),
((SELECT id FROM public.skills WHERE name = 'Node.js' LIMIT 1), (SELECT id FROM public.skills WHERE name = 'Express.js' LIMIT 1), 'branch', true, 'Natural progression for backend development'),
((SELECT id FROM public.skills WHERE name = 'Advanced CSS' LIMIT 1), (SELECT id FROM public.skills WHERE name = 'CSS Fundamentals' LIMIT 1), 'backtrack', false, 'Return to fundamentals for stronger foundation');
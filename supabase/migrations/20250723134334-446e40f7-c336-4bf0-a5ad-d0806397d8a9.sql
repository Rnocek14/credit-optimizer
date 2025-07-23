-- Fix security: Add missing RLS policies for career_steps table
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
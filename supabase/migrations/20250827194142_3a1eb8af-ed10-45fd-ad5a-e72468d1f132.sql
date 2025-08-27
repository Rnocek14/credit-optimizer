-- Enable RLS on the remaining tables
ALTER TABLE public.course_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Add basic policies for these tables
CREATE POLICY "Anyone can view course platforms" 
ON public.course_platforms 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage course platforms" 
ON public.course_platforms 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Anyone can view instructors" 
ON public.instructors 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage instructors" 
ON public.instructors 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
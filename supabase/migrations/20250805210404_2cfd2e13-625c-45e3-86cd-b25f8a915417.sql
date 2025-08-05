-- Fix mentor validation system using profiles table approach

-- 1. Ensure Aisha Khan has mentor role in profiles
INSERT INTO public.profiles (user_id, name, role)
VALUES ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Aisha Khan', 'mentor')
ON CONFLICT (user_id) DO UPDATE SET role = 'mentor', name = 'Aisha Khan';

-- 2. Create a security definer function to check mentor role from profiles
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'
  );
$$;

-- 3. Update mentor_course_curations RLS policy to use is_mentor function
DROP POLICY IF EXISTS "Mentors can manage course curations" ON public.mentor_course_curations;
CREATE POLICY "Mentors can manage course curations" ON public.mentor_course_curations
FOR ALL USING (public.is_mentor()) WITH CHECK (public.is_mentor());

-- 4. Update course_intelligence_pipeline RLS policy to use is_mentor function  
DROP POLICY IF EXISTS "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline;
CREATE POLICY "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline
FOR ALL USING (public.is_mentor()) WITH CHECK (public.is_mentor());
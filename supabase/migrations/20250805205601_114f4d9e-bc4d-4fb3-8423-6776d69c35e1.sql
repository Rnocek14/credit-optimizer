-- Fix mentor validation issues

-- 1. Create profiles entry for dev user first (needed for role assignment)
INSERT INTO public.profiles (user_id, name, role)
VALUES ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Aisha Khan', 'mentor'::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = 'mentor'::app_role;

-- 2. Update the course intelligence pipeline query to return more courses  
-- Change the pipeline stage filter to allow more courses through
UPDATE public.course_intelligence_pipeline 
SET pipeline_stage = 'mentor_review'
WHERE pipeline_stage = 'analysis' AND mentor_validation_status = 'pending';

-- 3. Fix the RLS policy for mentor_course_curations to allow mentor operations
DROP POLICY IF EXISTS "Mentors can manage course curations" ON public.mentor_course_curations;
CREATE POLICY "Mentors can manage course curations" ON public.mentor_course_curations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'::app_role
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'::app_role
  )
);

-- 4. Update course intelligence pipeline RLS to allow mentor access
DROP POLICY IF EXISTS "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline;
CREATE POLICY "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'::app_role
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'::app_role
  )
);
-- Fix mentor validation issues (updated approach)

-- 1. Check if profiles table has role column, add if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';
    END IF;
END
$$;

-- 2. Ensure Aisha Khan has a profile entry with mentor role
INSERT INTO public.profiles (user_id, name, role)
VALUES ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Aisha Khan', 'mentor')
ON CONFLICT (user_id) DO UPDATE SET role = 'mentor';

-- 3. Update the course intelligence pipeline query to return more courses
-- Change the pipeline stage filter to allow more courses through
UPDATE public.course_intelligence_pipeline 
SET pipeline_stage = 'mentor_review'
WHERE pipeline_stage = 'analysis' AND mentor_validation_status = 'pending';

-- 4. Fix the RLS policy for mentor_course_curations to allow mentor operations
DROP POLICY IF EXISTS "Mentors can manage course curations" ON public.mentor_course_curations;
CREATE POLICY "Mentors can manage course curations" ON public.mentor_course_curations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'
  )
);

-- 5. Update course intelligence pipeline RLS to allow mentor access
DROP POLICY IF EXISTS "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline;
CREATE POLICY "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'mentor'
  )
);
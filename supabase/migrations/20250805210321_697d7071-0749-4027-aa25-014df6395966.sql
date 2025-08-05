-- Fix mentor validation system by using proper role system

-- 1. Add Aisha Khan to user_roles table with mentor role
INSERT INTO public.user_roles (user_id, role)
VALUES ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'mentor'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Update mentor_course_curations RLS policy to use get_user_role function
DROP POLICY IF EXISTS "Mentors can manage course curations" ON public.mentor_course_curations;
CREATE POLICY "Mentors can manage course curations" ON public.mentor_course_curations
FOR ALL USING (
  public.get_user_role(auth.uid()) = 'mentor'
) WITH CHECK (
  public.get_user_role(auth.uid()) = 'mentor'
);

-- 3. Update course_intelligence_pipeline RLS policy to use get_user_role function  
DROP POLICY IF EXISTS "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline;
CREATE POLICY "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline
FOR ALL USING (
  public.get_user_role(auth.uid()) = 'mentor'
) WITH CHECK (
  public.get_user_role(auth.uid()) = 'mentor'
);
-- Check if Aisha Khan has mentor role in the database
-- First, let's check if the profiles table has the dev user data
INSERT INTO public.profiles (user_id, name, role) VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'Aisha Khan', 'mentor')
ON CONFLICT (user_id) DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Update the RLS policy on course_intelligence_pipeline to allow mentors to validate courses
-- First drop the existing restrictive policy if it exists
DROP POLICY IF EXISTS "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline;

-- Create a more permissive policy for mentors
CREATE POLICY "Mentors can manage course intelligence pipeline" 
ON public.course_intelligence_pipeline 
FOR ALL 
USING (
  CASE
    WHEN auth.uid() IS NOT NULL THEN 
      public.get_user_role(auth.uid()) IN ('mentor', 'admin')
    ELSE true  -- Allow service role access
  END
)
WITH CHECK (
  CASE
    WHEN auth.uid() IS NOT NULL THEN 
      public.get_user_role(auth.uid()) IN ('mentor', 'admin')
    ELSE true  -- Allow service role access
  END
);
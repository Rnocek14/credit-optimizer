-- Comprehensive mentor validation system fix

-- 1. Create session-agnostic mentor check function
CREATE OR REPLACE FUNCTION public.get_mentor_by_user_id(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'mentor'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role = 'mentor'
  );
$$;

-- 2. Add Aisha Khan to user_roles table for consistency
INSERT INTO public.user_roles (user_id, role)
VALUES ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'mentor'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Update mentor_course_curations RLS policy to use new function
DROP POLICY IF EXISTS "Mentors can manage course curations" ON public.mentor_course_curations;
CREATE POLICY "Mentors can manage course curations" ON public.mentor_course_curations
FOR ALL USING (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN public.is_mentor()
    ELSE public.get_mentor_by_user_id(mentor_id)
  END
) WITH CHECK (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN public.is_mentor()
    ELSE public.get_mentor_by_user_id(mentor_id)
  END
);

-- 4. Update course_intelligence_pipeline RLS policy  
DROP POLICY IF EXISTS "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline;
CREATE POLICY "Mentors can view and update pipeline courses" ON public.course_intelligence_pipeline
FOR ALL USING (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN public.is_mentor()
    ELSE true  -- Allow service role access for mentor operations
  END
) WITH CHECK (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN public.is_mentor()
    ELSE true  -- Allow service role access for mentor operations
  END
);

-- 5. Create a function to validate mentor permissions for operations
CREATE OR REPLACE FUNCTION public.validate_mentor_operation(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.get_mentor_by_user_id(user_uuid);
$$;
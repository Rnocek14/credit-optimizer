-- Comprehensive mentor validation system fix (revised)

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
  );
$$;

-- 2. Update mentor_course_curations RLS policy to work with both session and service role
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

-- 3. Update course_intelligence_pipeline RLS policy to work with service role
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

-- 4. Create a function to validate mentor permissions for operations
CREATE OR REPLACE FUNCTION public.validate_mentor_operation(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.get_mentor_by_user_id(user_uuid);
$$;
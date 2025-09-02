-- Ensure RLS policies are correct for user_alt_course_usage table
-- First check if the table exists, create if not
CREATE TABLE IF NOT EXISTS public.user_alt_course_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id UUID NOT NULL,
    alt_course_id UUID NOT NULL REFERENCES alternative_courses(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, track_id, alt_course_id)
);

-- Enable RLS on user_alt_course_usage
ALTER TABLE public.user_alt_course_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own alt course usage" ON public.user_alt_course_usage;

-- Create RLS policy for user_alt_course_usage
CREATE POLICY "Users can manage their own alt course usage"
ON public.user_alt_course_usage
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure alternative_courses has proper public read access
DROP POLICY IF EXISTS "Public read access to alternative courses" ON public.alternative_courses;
CREATE POLICY "Public read access to alternative courses" 
ON public.alternative_courses 
FOR SELECT 
USING (true);
-- Create a proper table for user-completed courses (alternative credit)
-- This is the canonical input for transfer verification, risk scoring, and degree planning

CREATE TABLE IF NOT EXISTS public.user_completed_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_code TEXT NOT NULL,        -- Normalized: SOPHIA, STUDYCOM, CLEP, etc.
  course_code TEXT NOT NULL,          -- Normalized: SOPHIA-INTRO-ACCOUNTING
  course_title TEXT,                  -- Human-readable title
  credits NUMERIC(4,1),               -- Credit value
  grade TEXT,                         -- A, B, C, Pass, Fail
  completed_on DATE,                  -- When the course was completed
  source TEXT NOT NULL DEFAULT 'manual',  -- manual, import, api
  marketplace_course_id UUID REFERENCES marketplace_courses(id), -- Optional link
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate entries for same course
  UNIQUE (user_id, provider_code, course_code)
);

-- Enable RLS
ALTER TABLE public.user_completed_courses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own completed courses"
  ON public.user_completed_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completed courses"
  ON public.user_completed_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completed courses"
  ON public.user_completed_courses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed courses"
  ON public.user_completed_courses FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_completed_courses_user_id 
  ON public.user_completed_courses(user_id);

CREATE INDEX IF NOT EXISTS idx_user_completed_courses_provider 
  ON public.user_completed_courses(provider_code);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_completed_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_completed_courses_timestamp
  BEFORE UPDATE ON public.user_completed_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_completed_courses_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.user_completed_courses IS 
  'Canonical table for user-completed alternative credit courses. Used for transfer verification, risk scoring, and degree planning.';
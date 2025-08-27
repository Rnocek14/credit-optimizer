-- Fix CI schema migration by handling existing policies
-- Drop existing conflicting policies first

-- Check and drop existing policies for user_course_events if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_course_events' AND policyname = 'Users can view their own course events') THEN
    DROP POLICY "Users can view their own course events" ON public.user_course_events;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_course_events' AND policyname = 'Users can manage their own course events') THEN
    DROP POLICY "Users can manage their own course events" ON public.user_course_events;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_course_events' AND policyname = 'Service role can manage all course events') THEN
    DROP POLICY "Service role can manage all course events" ON public.user_course_events;
  END IF;
END $$;

-- Create CI prefixed tables and views for Course Intelligence Master Spec
-- This creates the unified schema required by the Master Spec

-- Create ci_platforms table (maps to existing platforms or creates new)
CREATE TABLE IF NOT EXISTS public.ci_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ci_instructors table
CREATE TABLE IF NOT EXISTS public.ci_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org TEXT,
  reputation NUMERIC DEFAULT 0 CHECK (reputation >= 0 AND reputation <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ci_courses table (maps to existing courses or creates new)
CREATE TABLE IF NOT EXISTS public.ci_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  platform_id UUID REFERENCES public.ci_platforms(id),
  instructor_id UUID REFERENCES public.ci_instructors(id),
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  duration_hours NUMERIC DEFAULT 0,
  url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ci_course_cri_scores table
CREATE TABLE IF NOT EXISTS public.ci_course_cri_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.ci_courses(id) ON DELETE CASCADE,
  rigor_score NUMERIC DEFAULT 0 CHECK (rigor_score >= 0 AND rigor_score <= 100),
  difficulty_score NUMERIC DEFAULT 0 CHECK (difficulty_score >= 0 AND difficulty_score <= 100),
  outcome_score NUMERIC DEFAULT 0 CHECK (outcome_score >= 0 AND outcome_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id)
);

-- Create ci_track_cri_cache table for caching CRI calculations
CREATE TABLE IF NOT EXISTS public.ci_track_cri_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID,
  cri_score NUMERIC NOT NULL CHECK (cri_score >= 0 AND cri_score <= 100),
  cri_breakdown JSONB NOT NULL DEFAULT '{}',
  components JSONB NOT NULL DEFAULT '[]',
  model_version TEXT NOT NULL DEFAULT 'cri:v1',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Ensure user_course_events table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_course_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('enrolled', 'in_progress', 'completed', 'assessed', 'dropped')),
  score NUMERIC,
  completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ci_courses_platform_id ON public.ci_courses(platform_id);
CREATE INDEX IF NOT EXISTS idx_ci_courses_instructor_id ON public.ci_courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_ci_courses_active ON public.ci_courses(active);
CREATE INDEX IF NOT EXISTS idx_ci_track_cri_cache_user_track ON public.ci_track_cri_cache(user_id, track_id);
CREATE INDEX IF NOT EXISTS idx_ci_track_cri_cache_expires ON public.ci_track_cri_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_course_events_user_id ON public.user_course_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_events_course_id ON public.user_course_events(course_id);

-- Enable RLS on all tables
ALTER TABLE public.ci_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_course_cri_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_track_cri_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with proper existence checks)

-- Platforms and instructors are public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_platforms' AND policyname = 'Anyone can view platforms') THEN
    CREATE POLICY "Anyone can view platforms" ON public.ci_platforms FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_platforms' AND policyname = 'Service role can manage platforms') THEN
    CREATE POLICY "Service role can manage platforms" ON public.ci_platforms FOR ALL USING (true);
  END IF;
END $$;

-- Insert some sample data for development
INSERT INTO public.ci_platforms (slug, name, website_url) VALUES 
('udemy', 'Udemy', 'https://udemy.com'),
('coursera', 'Coursera', 'https://coursera.org'),
('edx', 'edX', 'https://edx.org'),
('pluralsight', 'Pluralsight', 'https://pluralsight.com'),
('linkedin-learning', 'LinkedIn Learning', 'https://linkedin.com/learning')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ci_instructors (name, org, reputation) VALUES 
('John Doe', 'Tech University', 4.8),
('Jane Smith', 'Code Academy', 4.5),
('Dr. Alan Johnson', 'MIT', 5.0),
('Sarah Wilson', 'Google', 4.7)
ON CONFLICT DO NOTHING;
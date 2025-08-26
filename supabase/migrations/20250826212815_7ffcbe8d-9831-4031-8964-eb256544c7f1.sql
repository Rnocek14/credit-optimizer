-- Master Integration: Course Intelligence + Multi-Track + Maya System
-- Phase 1: Core Data Model

-- Course platforms (Coursera, Udemy, etc.)
CREATE TABLE IF NOT EXISTS public.course_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  website_url TEXT,
  api_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Instructors with prestige scoring
CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform_id UUID REFERENCES public.course_platforms(id) ON DELETE SET NULL,
  prestige_score NUMERIC(4,2) DEFAULT 0.00 CHECK (prestige_score >= 0 AND prestige_score <= 10),
  rating_avg NUMERIC(4,2) DEFAULT 0.00,
  total_courses INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  bio TEXT,
  profile_url TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Skills (canonical skill taxonomy)
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  parent_skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  market_demand_score NUMERIC(4,2) DEFAULT 5.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Courses with difficulty and intelligence data
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES public.course_platforms(id) ON DELETE SET NULL,
  external_id TEXT, -- provider-specific id
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  difficulty NUMERIC(4,2) DEFAULT 5.00 CHECK (difficulty >= 0 AND difficulty <= 10),
  instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,
  rating_avg NUMERIC(4,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  duration_hours NUMERIC(8,2) DEFAULT 0.00,
  estimated_effort_hours NUMERIC(8,2) DEFAULT 0.00,
  language TEXT DEFAULT 'en',
  level TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  has_certificate BOOLEAN DEFAULT false,
  has_projects BOOLEAN DEFAULT false,
  cost_usd NUMERIC(10,2) DEFAULT 0.00,
  skills JSONB DEFAULT '[]'::jsonb, -- denormalized for quick access
  meta JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course ↔ Skill mapping (normalized)
CREATE TABLE IF NOT EXISTS public.course_skills (
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  weight NUMERIC(4,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 10),
  skill_level NUMERIC(4,2) DEFAULT 5.0 CHECK (skill_level >= 0 AND skill_level <= 10),
  PRIMARY KEY (course_id, skill_id)
);

-- Multi-Track system (career tracks)
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  difficulty_level TEXT DEFAULT 'beginner',
  estimated_duration_weeks INTEGER DEFAULT 12,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track required skills with target levels
CREATE TABLE IF NOT EXISTS public.track_skills (
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  required_level NUMERIC(4,2) DEFAULT 5.0 CHECK (required_level >= 0 AND required_level <= 10),
  weight NUMERIC(4,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 10),
  is_core BOOLEAN DEFAULT true,
  PRIMARY KEY (track_id, skill_id)
);

-- User course events (transcript/completion data)
CREATE TABLE IF NOT EXISTS public.user_course_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('enrolled','in_progress','completed','assessed','dropped')),
  progress_percent NUMERIC(5,2) DEFAULT 0.00 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100), -- for 'assessed'
  grade TEXT, -- A, B, C, Pass, Fail, etc.
  completion_date DATE,
  source TEXT DEFAULT 'self_report', -- provider_webhook, upload, manual, etc.
  evidence JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course substitutions/alternatives
CREATE TABLE IF NOT EXISTS public.course_substitutions (
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  substitute_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  reason TEXT,
  equivalence_score NUMERIC(4,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (course_id, substitute_course_id)
);

-- CRI cache per user per track (fast reads)
CREATE TABLE IF NOT EXISTS public.track_cri_cache (
  user_id UUID NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  cri NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (cri >= 0 AND cri <= 100),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  skill_levels JSONB DEFAULT '{}'::jsonb,
  gaps JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

-- User track assignments (which tracks user is following)
CREATE TABLE IF NOT EXISTS public.user_tracks (
  user_id UUID NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  target_completion_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

-- Function execution telemetry
CREATE TABLE IF NOT EXISTS public.fn_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fn_name TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL CHECK (status IN ('ok','error','timeout')),
  latency_ms INTEGER,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10,4) DEFAULT 0,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create supporting views
CREATE OR REPLACE VIEW public.courses_enriched AS
SELECT 
  c.*,
  i.prestige_score,
  i.name as instructor_name,
  i.rating_avg as instructor_rating,
  p.name as platform_name,
  p.slug as platform_slug
FROM public.courses c
LEFT JOIN public.instructors i ON i.id = c.instructor_id
LEFT JOIN public.course_platforms p ON p.id = c.platform_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_platform ON public.courses(platform_id);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON public.courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_course_skills_skill ON public.course_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_course_skills_course ON public.course_skills(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_events_user ON public.user_course_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_events_course ON public.user_course_events(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_events_type ON public.user_course_events(event_type);
CREATE INDEX IF NOT EXISTS idx_track_skills_track ON public.track_skills(track_id);
CREATE INDEX IF NOT EXISTS idx_track_skills_skill ON public.track_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_track_cri_cache_user ON public.track_cri_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_user ON public.user_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_fn_runs_fn_name ON public.fn_runs(fn_name);
CREATE INDEX IF NOT EXISTS idx_fn_runs_created_at ON public.fn_runs(created_at);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_platforms_updated_at BEFORE UPDATE ON public.course_platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON public.instructors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_course_events_updated_at BEFORE UPDATE ON public.user_course_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_tracks_updated_at BEFORE UPDATE ON public.user_tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Master Integration: Course Intelligence Schema (Part 1)
-- Create core platform and instructor tables first

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

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_course_platforms_updated_at BEFORE UPDATE ON public.course_platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON public.instructors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Master Integration: RLS Policies and Remaining Schema (Part 2)

-- Enable RLS and add policies for new tables
ALTER TABLE public.course_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access for course catalog data
CREATE POLICY "Anyone can view course platforms" ON public.course_platforms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view instructors" ON public.instructors
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view skills" ON public.skills
  FOR SELECT USING (true);

-- Service role can manage catalog data
CREATE POLICY "Service role can manage course platforms" ON public.course_platforms
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage instructors" ON public.instructors
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage skills" ON public.skills
  FOR ALL USING (true) WITH CHECK (true);

-- Continue with courses table
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
  level TEXT DEFAULT 'beginner',
  has_certificate BOOLEAN DEFAULT false,
  has_projects BOOLEAN DEFAULT false,
  cost_usd NUMERIC(10,2) DEFAULT 0.00,
  skills JSONB DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT USING (active = true);

CREATE POLICY "Service role can manage courses" ON public.courses
  FOR ALL USING (true) WITH CHECK (true);

-- Course ↔ Skill mapping
CREATE TABLE IF NOT EXISTS public.course_skills (
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  weight NUMERIC(4,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 10),
  skill_level NUMERIC(4,2) DEFAULT 5.0 CHECK (skill_level >= 0 AND skill_level <= 10),
  PRIMARY KEY (course_id, skill_id)
);

ALTER TABLE public.course_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course skills" ON public.course_skills
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage course skills" ON public.course_skills
  FOR ALL USING (true) WITH CHECK (true);

-- Apply update triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
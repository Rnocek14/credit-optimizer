-- Week 1: Education-First Spine Tables
-- Core education backbone tables for degree pathways

-- Education courses (foundational spine)
CREATE TABLE public.edu_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL, -- e.g. "CS101", "ENG101"
  title TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  level_year INTEGER NOT NULL DEFAULT 1, -- 1-4 for undergrad
  term TEXT CHECK (term IN ('fall', 'spring', 'summer', 'any')) DEFAULT 'any',
  area TEXT, -- e.g. "programming", "math", "general_education"
  is_core BOOLEAN NOT NULL DEFAULT false,
  is_capstone BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  learning_outcomes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course prerequisites and corequisites
CREATE TABLE public.edu_prereqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  child_course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  prereq_type TEXT CHECK (prereq_type IN ('prerequisite', 'corequisite')) NOT NULL DEFAULT 'prerequisite',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_course_id, child_course_id, prereq_type)
);

-- Degree requirements (gen ed, major cores, electives)
CREATE TABLE public.edu_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT CHECK (kind IN ('general_education', 'major_core', 'elective_pool', 'capstone')) NOT NULL,
  credits_required INTEGER NOT NULL DEFAULT 3,
  description TEXT,
  program_area TEXT, -- e.g. "software_engineering", "data_science"
  level_year INTEGER, -- which year this requirement should be fulfilled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mapping courses to requirements (many-to-many for elective pools)
CREATE TABLE public.edu_requirement_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID NOT NULL REFERENCES public.edu_requirements(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requirement_id, course_id)
);

-- Alternative credit options (CLEP, ACE, MOOC equivalencies)
CREATE TABLE public.edu_equivalencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID REFERENCES public.edu_requirements(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('CLEP', 'ACE', 'NCCRS', 'MOOC', 'PORTFOLIO')) NOT NULL,
  provider TEXT NOT NULL, -- e.g. "Study.com", "Sophia", "Straighterline"
  external_ref TEXT NOT NULL, -- course code or exam name at provider
  credits INTEGER NOT NULL DEFAULT 3,
  cost_estimate NUMERIC,
  time_estimate_hours INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_target_specified CHECK (requirement_id IS NOT NULL OR course_id IS NOT NULL)
);

-- Partner institution policies
CREATE TABLE public.partner_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name TEXT NOT NULL UNIQUE,
  partner_code TEXT NOT NULL UNIQUE, -- e.g. "TESU", "COSC", "WGU"
  max_alt_credits INTEGER NOT NULL DEFAULT 90,
  min_residency_credits INTEGER NOT NULL DEFAULT 30,
  upper_division_min INTEGER NOT NULL DEFAULT 18,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User academic progress tracking
CREATE TABLE public.user_academic_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  equivalency_id UUID REFERENCES public.edu_equivalencies(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.edu_requirements(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'completed', 'transferred')) NOT NULL DEFAULT 'planned',
  earned_credits INTEGER,
  source TEXT, -- where they completed it
  evidence_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_progress_target CHECK (course_id IS NOT NULL OR equivalency_id IS NOT NULL OR requirement_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_edu_courses_level_year ON public.edu_courses(level_year);
CREATE INDEX idx_edu_courses_area ON public.edu_courses(area);
CREATE INDEX idx_edu_prereqs_parent ON public.edu_prereqs(parent_course_id);
CREATE INDEX idx_edu_prereqs_child ON public.edu_prereqs(child_course_id);
CREATE INDEX idx_edu_requirements_program ON public.edu_requirements(program_area);
CREATE INDEX idx_edu_equivalencies_source ON public.edu_equivalencies(source);
CREATE INDEX idx_user_academic_progress_user ON public.user_academic_progress(user_id);

-- Enable RLS on all tables
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_prereqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_requirement_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_equivalencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_academic_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for public read access to curriculum data
CREATE POLICY "Anyone can view education courses" ON public.edu_courses FOR SELECT USING (true);
CREATE POLICY "Anyone can view course prerequisites" ON public.edu_prereqs FOR SELECT USING (true);
CREATE POLICY "Anyone can view degree requirements" ON public.edu_requirements FOR SELECT USING (true);
CREATE POLICY "Anyone can view requirement options" ON public.edu_requirement_options FOR SELECT USING (true);
CREATE POLICY "Anyone can view equivalencies" ON public.edu_equivalencies FOR SELECT USING (true);
CREATE POLICY "Anyone can view partner policies" ON public.partner_policies FOR SELECT USING (true);

-- RLS policies for user progress (private to user)
CREATE POLICY "Users can manage their own academic progress" ON public.user_academic_progress 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role can manage all education data
CREATE POLICY "Service role can manage education courses" ON public.edu_courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage course prerequisites" ON public.edu_prereqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage degree requirements" ON public.edu_requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage requirement options" ON public.edu_requirement_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage equivalencies" ON public.edu_equivalencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage partner policies" ON public.partner_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage user progress" ON public.user_academic_progress FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_edu_courses_updated_at BEFORE UPDATE ON public.edu_courses 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_edu_requirements_updated_at BEFORE UPDATE ON public.edu_requirements 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_edu_equivalencies_updated_at BEFORE UPDATE ON public.edu_equivalencies 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_policies_updated_at BEFORE UPDATE ON public.partner_policies 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_academic_progress_updated_at BEFORE UPDATE ON public.user_academic_progress 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Course Marketplace Schema (simplified version)
-- Create enum types
CREATE TYPE provider_type AS ENUM ('university', 'mooc', 'bootcamp', 'testing_center');
CREATE TYPE modality_type AS ENUM ('online', 'in_person', 'hybrid');
CREATE TYPE option_kind AS ENUM ('course', 'exam', 'cert');
CREATE TYPE rule_kind AS ENUM ('residency_min', 'transfer_max', 'upper_division_min', 'provider_blacklist', 'time_limit');
CREATE TYPE plan_status AS ENUM ('planned', 'enrolled', 'complete', 'dropped');
CREATE TYPE transfer_source AS ENUM ('ACE', 'NCCRS', 'CLEP', 'XFER', 'HOME', 'DSST');

-- Providers table
CREATE TABLE public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type provider_type NOT NULL,
  accreditation TEXT,
  country TEXT DEFAULT 'US',
  website_url TEXT,
  policies JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Marketplace courses table (separate from existing courses table)
CREATE TABLE public.marketplace_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  credits NUMERIC NOT NULL DEFAULT 3,
  level INTEGER, -- 100, 200, 300, 400 level
  modality modality_type DEFAULT 'online',
  duration_weeks INTEGER,
  cost_usd NUMERIC,
  start_dates JSONB DEFAULT '[]', -- Array of ISO date strings
  syllabus_text TEXT,
  skill_tags TEXT[] DEFAULT '{}',
  cri_score INTEGER, -- 0-100
  instructor_rating NUMERIC,
  completion_rate NUMERIC,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider_id, code)
);

-- Equivalence groups for courses that satisfy same requirements
CREATE TABLE public.equivalence_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Members of equivalence groups
CREATE TABLE public.equivalence_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.equivalence_groups(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'MANUAL', -- 'ACE', 'NCCRS', 'INSTITUTION', 'PREDICTED'
  confidence NUMERIC DEFAULT 1.0, -- 0.0 to 1.0
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, course_id)
);

-- Program requirements (extends existing requirement blocks)
CREATE TABLE public.program_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id TEXT NOT NULL, -- e.g., 'bs_cs', 'bs_it'
  track_id TEXT, -- e.g., 'se', 'ds' 
  requirement_block_id UUID, -- Link to existing requirement_blocks if available
  year INTEGER,
  category TEXT NOT NULL, -- 'gened', 'core', 'elective_pool', 'capstone'
  name TEXT NOT NULL,
  description TEXT,
  credits_required NUMERIC NOT NULL DEFAULT 3,
  min_select INTEGER DEFAULT 1, -- Minimum courses to select from options
  max_select INTEGER, -- Maximum courses that count toward this requirement
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Specific options that can satisfy a requirement
CREATE TABLE public.requirement_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID NOT NULL REFERENCES public.program_requirements(id) ON DELETE CASCADE,
  option_kind option_kind NOT NULL,
  option_ref_id UUID NOT NULL, -- course_id, exam_id, cert_id depending on kind
  min_grade TEXT, -- 'C', 'B', 'Pass', etc.
  credits_awarded NUMERIC,
  transfer_eligible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transfer and institutional rules
CREATE TABLE public.transfer_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  to_program_id TEXT NOT NULL, -- Program this rule applies to
  rule_kind rule_kind NOT NULL,
  value NUMERIC NOT NULL, -- The numeric value (credits, percentage, etc.)
  details JSONB DEFAULT '{}',
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Course prerequisites
CREATE TABLE public.course_prereqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
  prereq_course_id UUID REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
  prereq_skill_id UUID, -- Reference to skills if applicable
  min_grade TEXT DEFAULT 'C',
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User degree plans
CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_id TEXT NOT NULL,
  track_id TEXT,
  name TEXT NOT NULL,
  target_graduation DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Courses selected for user plans
CREATE TABLE public.user_plan_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.user_plans(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.program_requirements(id),
  course_id UUID NOT NULL REFERENCES public.marketplace_courses(id),
  provider_id UUID NOT NULL REFERENCES public.providers(id),
  planned_term TEXT, -- 'Fall 2024', 'Spring 2025', etc.
  status plan_status DEFAULT 'planned',
  transfer_source transfer_source,
  grade TEXT,
  credits_earned NUMERIC,
  cost_paid NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_id, course_id)
);

-- Enable RLS on all tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equivalence_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equivalence_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_prereqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Providers: Public read, service role manage
CREATE POLICY "Public read access to providers" ON public.providers FOR SELECT USING (active = true);
CREATE POLICY "Service role can manage providers" ON public.providers FOR ALL USING (true);

-- Marketplace courses: Public read, service role manage
CREATE POLICY "Public read access to marketplace courses" ON public.marketplace_courses FOR SELECT USING (active = true);
CREATE POLICY "Service role can manage marketplace courses" ON public.marketplace_courses FOR ALL USING (true);

-- Equivalence groups and members: Public read, service role manage
CREATE POLICY "Public read access to equivalence groups" ON public.equivalence_groups FOR SELECT USING (true);
CREATE POLICY "Service role can manage equivalence groups" ON public.equivalence_groups FOR ALL USING (true);
CREATE POLICY "Public read access to equivalence group members" ON public.equivalence_group_members FOR SELECT USING (true);
CREATE POLICY "Service role can manage equivalence group members" ON public.equivalence_group_members FOR ALL USING (true);

-- Program requirements and options: Public read, service role manage
CREATE POLICY "Public read access to program requirements" ON public.program_requirements FOR SELECT USING (true);
CREATE POLICY "Service role can manage program requirements" ON public.program_requirements FOR ALL USING (true);
CREATE POLICY "Public read access to requirement options" ON public.requirement_options FOR SELECT USING (true);
CREATE POLICY "Service role can manage requirement options" ON public.requirement_options FOR ALL USING (true);

-- Transfer rules: Public read, service role manage
CREATE POLICY "Public read access to transfer rules" ON public.transfer_rules FOR SELECT USING (active = true);
CREATE POLICY "Service role can manage transfer rules" ON public.transfer_rules FOR ALL USING (true);

-- Course prereqs: Public read, service role manage
CREATE POLICY "Public read access to course prereqs" ON public.course_prereqs FOR SELECT USING (true);
CREATE POLICY "Service role can manage course prereqs" ON public.course_prereqs FOR ALL USING (true);

-- User plans: Users can manage their own plans
CREATE POLICY "Users can manage their own plans" ON public.user_plans FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Service role can manage all plans" ON public.user_plans FOR ALL USING (true);

-- User plan courses: Users can manage their own plan courses
CREATE POLICY "Users can manage their own plan courses" ON public.user_plan_courses 
  FOR ALL USING (plan_id IN (SELECT id FROM public.user_plans WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Service role can manage all plan courses" ON public.user_plan_courses FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_marketplace_courses_provider_id ON public.marketplace_courses(provider_id);
CREATE INDEX idx_marketplace_courses_skill_tags ON public.marketplace_courses USING GIN(skill_tags);
CREATE INDEX idx_marketplace_courses_level_credits ON public.marketplace_courses(level, credits);
CREATE INDEX idx_equivalence_group_members_group_id ON public.equivalence_group_members(group_id);
CREATE INDEX idx_equivalence_group_members_course_id ON public.equivalence_group_members(course_id);
CREATE INDEX idx_program_requirements_program_track ON public.program_requirements(program_id, track_id);
CREATE INDEX idx_requirement_options_requirement_id ON public.requirement_options(requirement_id);
CREATE INDEX idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX idx_user_plan_courses_plan_id ON public.user_plan_courses(plan_id);
CREATE INDEX idx_user_plan_courses_requirement_id ON public.user_plan_courses(requirement_id);

-- Add updated_at triggers
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketplace_courses_updated_at BEFORE UPDATE ON public.marketplace_courses 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON public.user_plans 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_plan_courses_updated_at BEFORE UPDATE ON public.user_plan_courses 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
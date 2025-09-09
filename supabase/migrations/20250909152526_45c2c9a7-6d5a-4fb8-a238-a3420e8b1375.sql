-- Education-first skill tree tables

-- Courses table (extend existing or create new)
CREATE TABLE IF NOT EXISTS public.edu_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL,
  level_year INTEGER NOT NULL CHECK (level_year >= 1 AND level_year <= 4),
  term TEXT,
  area TEXT NOT NULL,
  is_core BOOLEAN DEFAULT false,
  is_capstone BOOLEAN DEFAULT false,
  description TEXT,
  learning_outcomes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Requirement blocks (k-of-n, all, or credits-basket)
CREATE TABLE IF NOT EXISTS public.edu_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('general_education', 'major_core', 'elective_pool', 'capstone')),
  credits_required INTEGER,
  description TEXT,
  program_area TEXT NOT NULL,
  level_year INTEGER NOT NULL CHECK (level_year >= 1 AND level_year <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- New requirement blocks table for the block-gated system
CREATE TABLE IF NOT EXISTS public.requirement_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('ALL', 'K_OF_N', 'CREDITS')),
  k INTEGER,
  credits_needed INTEGER,
  level_year INTEGER NOT NULL CHECK (level_year >= 1 AND level_year <= 4),
  area TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Membership: which courses belong to a block
CREATE TABLE IF NOT EXISTS public.block_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.requirement_blocks(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (block_id, course_id)
);

-- A gate is the output of a block; unit we connect with arrows
CREATE TABLE IF NOT EXISTS public.block_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL UNIQUE REFERENCES public.requirement_blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Edges: gate -> next block (unlock)
CREATE TABLE IF NOT EXISTS public.prereq_to_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_gate_id UUID NOT NULL REFERENCES public.block_gates(id) ON DELETE CASCADE,
  target_block_id UUID NOT NULL REFERENCES public.requirement_blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prerequisites table (extend existing)
CREATE TABLE IF NOT EXISTS public.edu_prereqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  child_course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  prereq_type TEXT NOT NULL CHECK (prereq_type IN ('prerequisite', 'corequisite')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equivalencies table (extend existing)
CREATE TABLE IF NOT EXISTS public.edu_equivalencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES public.edu_requirements(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('CLEP', 'ACE', 'NCCRS', 'MOOC', 'PORTFOLIO')),
  provider TEXT NOT NULL,
  external_ref TEXT NOT NULL,
  credits INTEGER NOT NULL,
  cost_estimate NUMERIC,
  time_estimate_hours INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prereq_to_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_prereqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_equivalencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access for education data
CREATE POLICY "Public read access to education courses" ON public.edu_courses FOR SELECT USING (true);
CREATE POLICY "Public read access to education requirements" ON public.edu_requirements FOR SELECT USING (true);
CREATE POLICY "Public read access to requirement blocks" ON public.requirement_blocks FOR SELECT USING (true);
CREATE POLICY "Public read access to block members" ON public.block_members FOR SELECT USING (true);
CREATE POLICY "Public read access to block gates" ON public.block_gates FOR SELECT USING (true);
CREATE POLICY "Public read access to prereq to block" ON public.prereq_to_block FOR SELECT USING (true);
CREATE POLICY "Public read access to edu prereqs" ON public.edu_prereqs FOR SELECT USING (true);
CREATE POLICY "Public read access to edu equivalencies" ON public.edu_equivalencies FOR SELECT USING (true);

-- Service role can manage all education data
CREATE POLICY "Service role can manage education courses" ON public.edu_courses FOR ALL USING (true);
CREATE POLICY "Service role can manage education requirements" ON public.edu_requirements FOR ALL USING (true);
CREATE POLICY "Service role can manage requirement blocks" ON public.requirement_blocks FOR ALL USING (true);
CREATE POLICY "Service role can manage block members" ON public.block_members FOR ALL USING (true);
CREATE POLICY "Service role can manage block gates" ON public.block_gates FOR ALL USING (true);
CREATE POLICY "Service role can manage prereq to block" ON public.prereq_to_block FOR ALL USING (true);
CREATE POLICY "Service role can manage edu prereqs" ON public.edu_prereqs FOR ALL USING (true);
CREATE POLICY "Service role can manage edu equivalencies" ON public.edu_equivalencies FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_block_members_block_id ON public.block_members(block_id);
CREATE INDEX IF NOT EXISTS idx_block_members_course_id ON public.block_members(course_id);
CREATE INDEX IF NOT EXISTS idx_block_gates_block_id ON public.block_gates(block_id);
CREATE INDEX IF NOT EXISTS idx_prereq_to_block_source ON public.prereq_to_block(source_gate_id);
CREATE INDEX IF NOT EXISTS idx_prereq_to_block_target ON public.prereq_to_block(target_block_id);
CREATE INDEX IF NOT EXISTS idx_edu_courses_area ON public.edu_courses(area);
CREATE INDEX IF NOT EXISTS idx_edu_courses_level_year ON public.edu_courses(level_year);
CREATE INDEX IF NOT EXISTS idx_requirement_blocks_area ON public.requirement_blocks(area);
CREATE INDEX IF NOT EXISTS idx_requirement_blocks_level_year ON public.requirement_blocks(level_year);
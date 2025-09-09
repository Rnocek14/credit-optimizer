-- Add nested blocks support
ALTER TABLE requirement_blocks ADD COLUMN parent_block_id UUID REFERENCES requirement_blocks(id);

-- Create skills and outcomes tables
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_skills (
  course_id UUID REFERENCES edu_courses(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  weight INTEGER DEFAULT 1,
  PRIMARY KEY (course_id, skill_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS block_outcomes (
  block_id UUID REFERENCES requirement_blocks(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  weight INTEGER DEFAULT 1,
  PRIMARY KEY (block_id, skill_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id TEXT NOT NULL,
  outcome_slug TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Partner/transfer rules
CREATE TABLE IF NOT EXISTS partner_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner TEXT NOT NULL,
  max_transfer_credits INTEGER,
  max_alt_credit INTEGER,
  residency_credits INTEGER,
  upper_division_min INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alternative credit options
CREATE TABLE IF NOT EXISTS alt_credit_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES edu_courses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'CLEP', 'Sophia', 'Saylor', etc.
  provider_course_id TEXT,
  provider_course_name TEXT NOT NULL,
  cost_estimate DECIMAL(10,2),
  estimated_hours INTEGER,
  proctoring_required BOOLEAN DEFAULT false,
  acceptance_rate DECIMAL(3,2) DEFAULT 0.85,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Entry roles and requirements
CREATE TABLE IF NOT EXISTS entry_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avg_salary_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_requirements (
  role_id UUID REFERENCES entry_roles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  threshold INTEGER DEFAULT 1,
  weight INTEGER DEFAULT 1,
  PRIMARY KEY (role_id, skill_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Portfolio projects
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  block_id UUID REFERENCES requirement_blocks(id),
  estimated_hours INTEGER,
  difficulty_level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alt_credit_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access to skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Public read access to course_skills" ON course_skills FOR SELECT USING (true);
CREATE POLICY "Public read access to block_outcomes" ON block_outcomes FOR SELECT USING (true);
CREATE POLICY "Public read access to program_outcomes" ON program_outcomes FOR SELECT USING (true);
CREATE POLICY "Public read access to partner_rules" ON partner_rules FOR SELECT USING (true);
CREATE POLICY "Public read access to alt_credit_options" ON alt_credit_options FOR SELECT USING (true);
CREATE POLICY "Public read access to entry_roles" ON entry_roles FOR SELECT USING (true);
CREATE POLICY "Public read access to role_requirements" ON role_requirements FOR SELECT USING (true);
CREATE POLICY "Public read access to portfolio_projects" ON portfolio_projects FOR SELECT USING (true);

-- Service role management policies
CREATE POLICY "Service role can manage skills" ON skills FOR ALL USING (true);
CREATE POLICY "Service role can manage course_skills" ON course_skills FOR ALL USING (true);
CREATE POLICY "Service role can manage block_outcomes" ON block_outcomes FOR ALL USING (true);
CREATE POLICY "Service role can manage program_outcomes" ON program_outcomes FOR ALL USING (true);
CREATE POLICY "Service role can manage partner_rules" ON partner_rules FOR ALL USING (true);
CREATE POLICY "Service role can manage alt_credit_options" ON alt_credit_options FOR ALL USING (true);
CREATE POLICY "Service role can manage entry_roles" ON entry_roles FOR ALL USING (true);
CREATE POLICY "Service role can manage role_requirements" ON role_requirements FOR ALL USING (true);
CREATE POLICY "Service role can manage portfolio_projects" ON portfolio_projects FOR ALL USING (true);
-- ============================================================================
-- Phase 1: Institution & Equivalency System (MVP - TESU Vertical Slice)
-- ============================================================================

-- ============================================================================
-- Table: institutions
-- Master list of partner universities/colleges
-- ============================================================================
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'TESU', 'COSC', 'WGU', etc.
  name TEXT NOT NULL,
  full_name TEXT,
  type TEXT NOT NULL DEFAULT 'university', -- 'university', 'community_college', 'bootcamp'
  accreditation TEXT, -- 'MSCHE', 'HLC', etc.
  website_url TEXT,
  logo_url TEXT,
  delivery_mode TEXT DEFAULT 'online', -- 'online', 'hybrid', 'in_person'
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_institutions_code ON institutions(code);
CREATE INDEX idx_institutions_active ON institutions(active);

-- ============================================================================
-- Table: institution_credit_limits
-- Normalized credit caps and requirements per institution
-- ============================================================================
CREATE TABLE IF NOT EXISTS institution_credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL, -- 'total_transfer', 'alt_credit_max', 'min_residency', 'upper_level_min', 'comm_college_max'
  credit_value INTEGER NOT NULL,
  applies_to_program TEXT, -- NULL = applies to all programs, or specific program code
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, limit_type, applies_to_program)
);

CREATE INDEX idx_credit_limits_institution ON institution_credit_limits(institution_id);
CREATE INDEX idx_credit_limits_type ON institution_credit_limits(limit_type);

-- ============================================================================
-- Table: gened_frameworks
-- GenEd requirement structures per institution
-- ============================================================================
CREATE TABLE IF NOT EXISTS gened_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  framework_name TEXT NOT NULL, -- 'Framework 30', 'SNHU Core', 'WGU GenEd'
  framework_code TEXT, -- 'FW30', 'CORE_2025'
  total_credits INTEGER NOT NULL,
  description TEXT,
  effective_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, framework_code)
);

CREATE INDEX idx_gened_frameworks_institution ON gened_frameworks(institution_id);

-- ============================================================================
-- Table: gened_categories
-- Individual GenEd requirement categories within a framework
-- ============================================================================
CREATE TABLE IF NOT EXISTS gened_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES gened_frameworks(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL, -- 'WRITTEN_COMM', 'QUANTITATIVE', 'LAB_SCIENCE'
  category_name TEXT NOT NULL,
  credits_required INTEGER NOT NULL,
  min_grade TEXT, -- 'C', 'C-', NULL
  special_requirements JSONB DEFAULT '{}', -- lab requirement, composition requirement, etc.
  priority_order INTEGER DEFAULT 0, -- order for filling requirements
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(framework_id, category_code)
);

CREATE INDEX idx_gened_categories_framework ON gened_categories(framework_id);
CREATE INDEX idx_gened_categories_priority ON gened_categories(priority_order);

-- ============================================================================
-- Table: alt_credits
-- Catalog of alternative credit sources (CLEP, DSST, Sophia, Study.com, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS alt_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code TEXT NOT NULL, -- 'CLEP', 'DSST', 'SOPHIA', 'STUDY_COM', 'STRAIGHTERLINE'
  source_type TEXT NOT NULL, -- 'exam', 'ace_course', 'nccrs_course', 'certification', 'portfolio'
  identifier TEXT NOT NULL, -- 'COLLEGE_ALGEBRA', 'ENG101', 'ETHICS1000'
  display_name TEXT NOT NULL,
  description TEXT,
  credit_recommendation INTEGER, -- ACE/NCCRS recommended credits
  level INTEGER, -- 100-400 level
  evaluation_body TEXT, -- 'ACE', 'NCCRS', 'College Board'
  ace_id TEXT,
  nccrs_id TEXT,
  provider_url TEXT,
  cost_usd NUMERIC(10,2),
  estimated_hours INTEGER,
  min_score INTEGER, -- for exams
  passing_criteria TEXT,
  metadata JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_code, identifier)
);

CREATE INDEX idx_alt_credits_source ON alt_credits(source_code);
CREATE INDEX idx_alt_credits_type ON alt_credits(source_type);
CREATE INDEX idx_alt_credits_identifier ON alt_credits(source_code, identifier);

-- ============================================================================
-- Table: cross_institution_equivalencies
-- Maps alt credits to institution-specific courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_institution_equivalencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alt_credit_id UUID NOT NULL REFERENCES alt_credits(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  institutional_course_code TEXT NOT NULL, -- 'MAT-121', 'ENC-101', 'PHI-286'
  institutional_course_name TEXT,
  credits_awarded INTEGER NOT NULL,
  level INTEGER, -- 100-400
  gened_category_id UUID REFERENCES gened_categories(id) ON DELETE SET NULL,
  requirement_area TEXT, -- 'major', 'elective', 'gened', 'free_elective'
  confidence NUMERIC(3,2) DEFAULT 1.0, -- 0.0-1.0
  source_documentation TEXT, -- URL or citation
  notes TEXT,
  active BOOLEAN DEFAULT true,
  verified_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alt_credit_id, institution_id, institutional_course_code)
);

CREATE INDEX idx_cross_equiv_alt_credit ON cross_institution_equivalencies(alt_credit_id);
CREATE INDEX idx_cross_equiv_institution ON cross_institution_equivalencies(institution_id);
CREATE INDEX idx_cross_equiv_course_code ON cross_institution_equivalencies(institutional_course_code);
CREATE INDEX idx_cross_equiv_gened ON cross_institution_equivalencies(gened_category_id);
CREATE INDEX idx_cross_equiv_lookup ON cross_institution_equivalencies(alt_credit_id, institution_id);

-- ============================================================================
-- Table: degree_templates
-- Pre-built degree pathways (Standard, Fastest, Cheapest, Alt-Max, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS degree_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  program_code TEXT NOT NULL, -- 'BS_CS', 'BSBA', 'BSN'
  program_name TEXT NOT NULL,
  track_type TEXT NOT NULL, -- 'standard', 'fastest', 'cheapest', 'alt_max', 'hybrid'
  template_name TEXT NOT NULL, -- 'TESU BSBA - Fastest Path'
  template_description TEXT,
  total_credits INTEGER NOT NULL,
  estimated_cost_usd NUMERIC(10,2),
  estimated_duration_months INTEGER,
  template_data JSONB NOT NULL, -- Full course list, term-by-term breakdown
  career_alignment TEXT[], -- Array of career IDs
  popularity_score INTEGER DEFAULT 0,
  badge TEXT, -- 'Fastest', 'Cheapest', 'Most Popular', 'Balanced'
  metadata JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, program_code, track_type)
);

CREATE INDEX idx_degree_templates_institution ON degree_templates(institution_id);
CREATE INDEX idx_degree_templates_program ON degree_templates(program_code);
CREATE INDEX idx_degree_templates_track ON degree_templates(track_type);
CREATE INDEX idx_degree_templates_popularity ON degree_templates(popularity_score DESC);

-- ============================================================================
-- RLS Policies (Public read access for now, admin write)
-- ============================================================================

-- institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to institutions" ON institutions FOR SELECT USING (true);

-- institution_credit_limits
ALTER TABLE institution_credit_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to credit limits" ON institution_credit_limits FOR SELECT USING (true);

-- gened_frameworks
ALTER TABLE gened_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to gened frameworks" ON gened_frameworks FOR SELECT USING (true);

-- gened_categories
ALTER TABLE gened_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to gened categories" ON gened_categories FOR SELECT USING (true);

-- alt_credits
ALTER TABLE alt_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to alt credits" ON alt_credits FOR SELECT USING (true);

-- cross_institution_equivalencies
ALTER TABLE cross_institution_equivalencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to equivalencies" ON cross_institution_equivalencies FOR SELECT USING (true);

-- degree_templates
ALTER TABLE degree_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to degree templates" ON degree_templates FOR SELECT USING (true);

-- ============================================================================
-- SEED DATA: TESU (Thomas Edison State University)
-- ============================================================================

-- Insert TESU institution
INSERT INTO institutions (code, name, full_name, type, accreditation, website_url, delivery_mode, active)
VALUES (
  'TESU',
  'Thomas Edison State University',
  'Thomas Edison State University',
  'university',
  'MSCHE',
  'https://www.tesu.edu',
  'online',
  true
) ON CONFLICT (code) DO NOTHING;

-- Insert TESU credit limits
INSERT INTO institution_credit_limits (institution_id, limit_type, credit_value, applies_to_program, notes)
SELECT 
  i.id,
  limit_type,
  credit_value,
  applies_to_program,
  notes
FROM institutions i, (VALUES
  ('total_transfer', 114, NULL, 'Max 114 credits can transfer; must earn 6+ at TESU'),
  ('alt_credit_max', 90, NULL, 'Max 90 credits from ACE/NCCRS/exams (non-collegiate sources)'),
  ('min_residency', 6, NULL, 'Minimum 6 credits must be earned at TESU (waivable with fee)'),
  ('min_residency_waived', 3, NULL, 'With waiver fee, only need 3cr capstone + 1cr cornerstone'),
  ('min_ra_credit', 30, NULL, 'At least 30 credits must be from regionally accredited institutions or TESU'),
  ('upper_level_major', 18, NULL, 'Typically 18 UL credits required in major (program-specific)')
) AS limits(limit_type, credit_value, applies_to_program, notes)
WHERE i.code = 'TESU'
ON CONFLICT (institution_id, limit_type, applies_to_program) DO NOTHING;

-- Insert TESU GenEd Framework
INSERT INTO gened_frameworks (institution_id, framework_name, framework_code, total_credits, description, active)
SELECT 
  i.id,
  'Framework 30 (General Education)',
  'FW30',
  60,
  'TESU General Education requirements: 60 credits across 5 core areas',
  true
FROM institutions i
WHERE i.code = 'TESU'
ON CONFLICT (institution_id, framework_code) DO NOTHING;

-- Insert TESU GenEd Categories
INSERT INTO gened_categories (framework_id, category_code, category_name, credits_required, min_grade, special_requirements, priority_order, notes)
SELECT 
  gf.id,
  category_code,
  category_name,
  credits_required,
  min_grade,
  special_requirements::jsonb,
  priority_order,
  notes
FROM gened_frameworks gf, (VALUES
  ('WRITTEN_COMM', 'Written Communication', 6, NULL, '{"courses": ["ENC-101", "ENC-102"], "requirement": "English Composition I & II"}', 1, 'Required: ENC-101 and ENC-102'),
  ('ORAL_COMM', 'Oral Communication', 3, NULL, '{"requirement": "One course in oral/interpersonal communication"}', 2, 'e.g. COM-209 Public Speaking'),
  ('QUANTITATIVE', 'Quantitative Literacy', 3, NULL, '{"requirement": "College-level mathematics"}', 3, 'e.g. MAT-121 College Algebra'),
  ('CIVIC_GLOBAL', 'Civic & Global Leadership', 9, NULL, '{"areas": ["diversity", "ethics", "civic_engagement"]}', 4, 'Includes Diversity, Ethics, Civic Engagement'),
  ('HUMANITIES', 'Knowledge of Human Cultures - Humanities', 9, NULL, '{}', 5, 'Philosophy, Literature, History, Languages'),
  ('SOCIAL_SCIENCE', 'Knowledge of Human Cultures - Social Sciences', 6, NULL, '{}', 6, 'Sociology, Psychology, Economics, Political Science'),
  ('NATURAL_SCIENCE', 'Understanding Physical & Natural World', 8, NULL, '{"requirement": "Natural Sciences, Computer Science, Math"}', 7, 'Sciences, CompSci courses'),
  ('GENED_ELECTIVES', 'General Education Electives', 16, NULL, '{}', 8, 'Additional GenEd courses from any area')
) AS cats(category_code, category_name, credits_required, min_grade, special_requirements, priority_order, notes)
WHERE gf.framework_code = 'FW30'
ON CONFLICT (framework_id, category_code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Alternative Credits (Key CLEP, DSST, Sophia courses for TESU)
-- ============================================================================

-- CLEP Exams
INSERT INTO alt_credits (source_code, source_type, identifier, display_name, description, credit_recommendation, level, evaluation_body, min_score, cost_usd, estimated_hours)
VALUES
  ('CLEP', 'exam', 'COLLEGE_COMPOSITION', 'College Composition', 'CLEP College Composition with Essay', 6, 100, 'ACE', 50, 89, 20),
  ('CLEP', 'exam', 'COLLEGE_ALGEBRA', 'College Algebra', 'CLEP College Algebra', 3, 100, 'ACE', 50, 89, 15),
  ('CLEP', 'exam', 'ANALYZING_INTERPRETING_LIT', 'Analyzing & Interpreting Literature', 'CLEP Analyzing and Interpreting Literature', 6, 200, 'ACE', 50, 89, 20),
  ('CLEP', 'exam', 'PRINCIPLES_MANAGEMENT', 'Principles of Management', 'CLEP Principles of Management', 3, 300, 'ACE', 50, 89, 15),
  ('CLEP', 'exam', 'PRINCIPLES_MARKETING', 'Principles of Marketing', 'CLEP Principles of Marketing', 3, 300, 'ACE', 50, 89, 15),
  ('CLEP', 'exam', 'INTRO_PSYCHOLOGY', 'Introductory Psychology', 'CLEP Introductory Psychology', 3, 100, 'ACE', 50, 89, 12),
  ('CLEP', 'exam', 'INTRO_SOCIOLOGY', 'Introductory Sociology', 'CLEP Introductory Sociology', 3, 100, 'ACE', 50, 89, 12)
ON CONFLICT (source_code, identifier) DO NOTHING;

-- DSST Exams
INSERT INTO alt_credits (source_code, source_type, identifier, display_name, description, credit_recommendation, level, evaluation_body, min_score, cost_usd, estimated_hours)
VALUES
  ('DSST', 'exam', 'PUBLIC_SPEAKING', 'Principles of Public Speaking', 'DSST Principles of Public Speaking', 3, 200, 'ACE', 400, 85, 12),
  ('DSST', 'exam', 'ETHICS_AMERICA', 'Ethics in America', 'DSST Ethics in America', 3, 200, 'ACE', 400, 85, 15),
  ('DSST', 'exam', 'BUSINESS_LAW_II', 'Business Law II', 'DSST Business Law II', 3, 300, 'ACE', 400, 85, 18)
ON CONFLICT (source_code, identifier) DO NOTHING;

-- Sophia Courses
INSERT INTO alt_credits (source_code, source_type, identifier, display_name, description, credit_recommendation, level, evaluation_body, cost_usd, estimated_hours)
VALUES
  ('SOPHIA', 'ace_course', 'ENG101', 'English Composition I', 'Sophia English Composition I', 3, 100, 'ACE', 99, 30),
  ('SOPHIA', 'ace_course', 'ENG102', 'English Composition II', 'Sophia English Composition II', 3, 100, 'ACE', 99, 30),
  ('SOPHIA', 'ace_course', 'COLLEGE_ALGEBRA', 'College Algebra', 'Sophia College Algebra', 3, 100, 'ACE', 99, 25),
  ('SOPHIA', 'ace_course', 'ETHICS1000', 'Introduction to Ethics', 'Sophia Introduction to Ethics', 3, 200, 'ACE', 99, 20),
  ('SOPHIA', 'ace_course', 'MACRO101', 'Macroeconomics', 'Sophia Macroeconomics', 3, 200, 'ACE', 99, 25),
  ('SOPHIA', 'ace_course', 'MICRO101', 'Microeconomics', 'Sophia Microeconomics', 3, 200, 'ACE', 99, 25),
  ('SOPHIA', 'ace_course', 'INTRO_PSYCH', 'Introduction to Psychology', 'Sophia Introduction to Psychology', 3, 100, 'ACE', 99, 25),
  ('SOPHIA', 'ace_course', 'INTRO_SOC', 'Introduction to Sociology', 'Sophia Introduction to Sociology', 3, 100, 'ACE', 99, 25),
  ('SOPHIA', 'ace_course', 'HUMAN_BIO', 'Human Biology', 'Sophia Human Biology', 3, 100, 'ACE', 99, 30)
ON CONFLICT (source_code, identifier) DO NOTHING;

-- Study.com Courses
INSERT INTO alt_credits (source_code, source_type, identifier, display_name, description, credit_recommendation, level, evaluation_body, cost_usd, estimated_hours)
VALUES
  ('STUDY_COM', 'ace_course', 'ACCT101', 'Accounting 101: Financial Accounting', 'Study.com Financial Accounting', 3, 100, 'ACE', 200, 35),
  ('STUDY_COM', 'ace_course', 'ACCT102', 'Accounting 102: Managerial Accounting', 'Study.com Managerial Accounting', 3, 200, 'ACE', 200, 35),
  ('STUDY_COM', 'ace_course', 'BUS101', 'Business 101: Principles of Management', 'Study.com Principles of Management', 3, 300, 'ACE', 200, 30),
  ('STUDY_COM', 'ace_course', 'BUS104', 'Business 104: Information Systems', 'Study.com Information Systems and Computer Applications', 3, 300, 'ACE', 200, 35)
ON CONFLICT (source_code, identifier) DO NOTHING;

-- ============================================================================
-- SEED DATA: Cross-Institution Equivalencies (TESU)
-- ============================================================================

-- CLEP -> TESU Equivalencies
INSERT INTO cross_institution_equivalencies (alt_credit_id, institution_id, institutional_course_code, institutional_course_name, credits_awarded, level, gened_category_id, requirement_area, confidence, source_documentation)
SELECT 
  ac.id,
  i.id,
  equiv_data.course_code,
  equiv_data.course_name,
  equiv_data.credits,
  equiv_data.level,
  gc.id,
  equiv_data.req_area,
  equiv_data.confidence,
  equiv_data.source_doc
FROM alt_credits ac
CROSS JOIN institutions i
LEFT JOIN gened_frameworks gf ON gf.institution_id = i.id AND gf.framework_code = 'FW30'
LEFT JOIN LATERAL (
  SELECT 
    course_code,
    course_name,
    credits,
    level,
    gened_cat,
    req_area,
    confidence,
    source_doc
  FROM (VALUES
    ('COLLEGE_COMPOSITION', 'ENC-101, ENC-102', 'English Composition I & II', 6, 100, 'WRITTEN_COMM', 'gened', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('COLLEGE_ALGEBRA', 'MAT-121', 'College Algebra', 3, 100, 'QUANTITATIVE', 'gened', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('ANALYZING_INTERPRETING_LIT', 'ENG-205, ENG-206', 'Literature Electives', 6, 200, 'HUMANITIES', 'gened', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('PRINCIPLES_MANAGEMENT', 'MAN-301', 'Principles of Management', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('PRINCIPLES_MARKETING', 'MAR-301', 'Principles of Marketing', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('INTRO_PSYCHOLOGY', 'PSY-101', 'Introduction to Psychology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('INTRO_SOCIOLOGY', 'SOC-101', 'Introduction to Sociology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit')
  ) AS e(alt_id, course_code, course_name, credits, level, gened_cat, req_area, confidence, source_doc)
  WHERE ac.identifier = e.alt_id
) AS equiv_data ON true
LEFT JOIN gened_categories gc ON gc.framework_id = gf.id AND gc.category_code = equiv_data.gened_cat
WHERE ac.source_code = 'CLEP' AND i.code = 'TESU'
ON CONFLICT (alt_credit_id, institution_id, institutional_course_code) DO NOTHING;

-- DSST -> TESU Equivalencies
INSERT INTO cross_institution_equivalencies (alt_credit_id, institution_id, institutional_course_code, institutional_course_name, credits_awarded, level, gened_category_id, requirement_area, confidence, source_documentation)
SELECT 
  ac.id,
  i.id,
  equiv_data.course_code,
  equiv_data.course_name,
  equiv_data.credits,
  equiv_data.level,
  gc.id,
  equiv_data.req_area,
  equiv_data.confidence,
  equiv_data.source_doc
FROM alt_credits ac
CROSS JOIN institutions i
LEFT JOIN gened_frameworks gf ON gf.institution_id = i.id AND gf.framework_code = 'FW30'
LEFT JOIN LATERAL (
  SELECT 
    course_code,
    course_name,
    credits,
    level,
    gened_cat,
    req_area,
    confidence,
    source_doc
  FROM (VALUES
    ('PUBLIC_SPEAKING', 'COM-209', 'Public Speaking', 3, 200, 'ORAL_COMM', 'gened', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('ETHICS_AMERICA', 'PHI-286', 'Ethics in America', 3, 200, 'CIVIC_GLOBAL', 'gened', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit'),
    ('BUSINESS_LAW_II', 'LAW-201', 'Business Law', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/courses/testing-credit')
  ) AS e(alt_id, course_code, course_name, credits, level, gened_cat, req_area, confidence, source_doc)
  WHERE ac.identifier = e.alt_id
) AS equiv_data ON true
LEFT JOIN gened_categories gc ON gc.framework_id = gf.id AND gc.category_code = equiv_data.gened_cat
WHERE ac.source_code = 'DSST' AND i.code = 'TESU'
ON CONFLICT (alt_credit_id, institution_id, institutional_course_code) DO NOTHING;

-- Sophia -> TESU Equivalencies
INSERT INTO cross_institution_equivalencies (alt_credit_id, institution_id, institutional_course_code, institutional_course_name, credits_awarded, level, gened_category_id, requirement_area, confidence, source_documentation)
SELECT 
  ac.id,
  i.id,
  equiv_data.course_code,
  equiv_data.course_name,
  equiv_data.credits,
  equiv_data.level,
  gc.id,
  equiv_data.req_area,
  equiv_data.confidence,
  equiv_data.source_doc
FROM alt_credits ac
CROSS JOIN institutions i
LEFT JOIN gened_frameworks gf ON gf.institution_id = i.id AND gf.framework_code = 'FW30'
LEFT JOIN LATERAL (
  SELECT 
    course_code,
    course_name,
    credits,
    level,
    gened_cat,
    req_area,
    confidence,
    source_doc
  FROM (VALUES
    ('ENG101', 'ENC-101', 'English Composition I', 3, 100, 'WRITTEN_COMM', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('ENG102', 'ENC-102', 'English Composition II', 3, 100, 'WRITTEN_COMM', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('COLLEGE_ALGEBRA', 'MAT-121', 'College Algebra', 3, 100, 'QUANTITATIVE', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('ETHICS1000', 'PHI-286', 'Ethics', 3, 200, 'CIVIC_GLOBAL', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('MACRO101', 'ECO-111', 'Macroeconomics', 3, 200, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('MICRO101', 'ECO-112', 'Microeconomics', 3, 200, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('INTRO_PSYCH', 'PSY-101', 'Introduction to Psychology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('INTRO_SOC', 'SOC-101', 'Introduction to Sociology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/partners/sophia-learning'),
    ('HUMAN_BIO', 'BIO-208', 'Human Biology', 3, 100, 'NATURAL_SCIENCE', 'gened', 0.9, 'https://www.tesu.edu/partners/sophia-learning')
  ) AS e(alt_id, course_code, course_name, credits, level, gened_cat, req_area, confidence, source_doc)
  WHERE ac.identifier = e.alt_id
) AS equiv_data ON true
LEFT JOIN gened_categories gc ON gc.framework_id = gf.id AND gc.category_code = equiv_data.gened_cat
WHERE ac.source_code = 'SOPHIA' AND i.code = 'TESU'
ON CONFLICT (alt_credit_id, institution_id, institutional_course_code) DO NOTHING;

-- Study.com -> TESU Equivalencies
INSERT INTO cross_institution_equivalencies (alt_credit_id, institution_id, institutional_course_code, institutional_course_name, credits_awarded, level, gened_category_id, requirement_area, confidence, source_documentation)
SELECT 
  ac.id,
  i.id,
  equiv_data.course_code,
  equiv_data.course_name,
  equiv_data.credits,
  equiv_data.level,
  NULL, -- Not GenEd
  equiv_data.req_area,
  equiv_data.confidence,
  equiv_data.source_doc
FROM alt_credits ac
CROSS JOIN institutions i
LEFT JOIN LATERAL (
  SELECT 
    course_code,
    course_name,
    credits,
    level,
    req_area,
    confidence,
    source_doc
  FROM (VALUES
    ('ACCT101', 'ACC-101', 'Principles of Financial Accounting', 3, 100, 'major', 1.0, 'https://www.tesu.edu/partners/studycom'),
    ('ACCT102', 'ACC-102', 'Principles of Managerial Accounting', 3, 200, 'major', 1.0, 'https://www.tesu.edu/partners/studycom'),
    ('BUS101', 'MAN-301', 'Principles of Management', 3, 300, 'major', 1.0, 'https://www.tesu.edu/partners/studycom'),
    ('BUS104', 'CIS-301', 'Management Information Systems', 3, 300, 'major', 1.0, 'https://www.tesu.edu/partners/studycom')
  ) AS e(alt_id, course_code, course_name, credits, level, req_area, confidence, source_doc)
  WHERE ac.identifier = e.alt_id
) AS equiv_data ON true
WHERE ac.source_code = 'STUDY_COM' AND i.code = 'TESU'
ON CONFLICT (alt_credit_id, institution_id, institutional_course_code) DO NOTHING;

-- ============================================================================
-- Success message
-- ============================================================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Phase 1 Migration Complete: Core tables created and TESU data seeded';
  RAISE NOTICE '📊 Tables created: institutions, institution_credit_limits, gened_frameworks, gened_categories, alt_credits, cross_institution_equivalencies, degree_templates';
  RAISE NOTICE '🎓 TESU institution configured with GenEd framework and ~20 alternative credit equivalencies';
END $$;

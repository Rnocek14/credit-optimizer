-- Add unique constraints (skip if they exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requirement_catalog_canon_req_code_key') THEN
    ALTER TABLE public.requirement_catalog ADD CONSTRAINT requirement_catalog_canon_req_code_key UNIQUE (canon_req_code);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_policies_partner_code_key') THEN
    ALTER TABLE public.partner_policies ADD CONSTRAINT partner_policies_partner_code_key UNIQUE (partner_code);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_transfer_rules_source_target_key') THEN
    ALTER TABLE public.credit_transfer_rules ADD CONSTRAINT credit_transfer_rules_source_target_key UNIQUE (source_institution, source_course_code, target_institution);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'option_exclusions_options_key') THEN
    ALTER TABLE public.option_exclusions ADD CONSTRAINT option_exclusions_options_key UNIQUE (option_a_id, option_b_id);
  END IF;
END $$;

-- Backfill provider codes
UPDATE public.providers SET provider_code = 'TESU' WHERE provider_code IS NULL AND name ILIKE '%thomas edison%';
UPDATE public.providers SET provider_code = 'WGU' WHERE provider_code IS NULL AND name ILIKE '%western governors%';
UPDATE public.providers SET provider_code = 'SOPHIA' WHERE provider_code IS NULL AND name ILIKE '%sophia%';
UPDATE public.providers SET provider_code = 'STUDY' WHERE provider_code IS NULL AND name ILIKE '%study.com%';
UPDATE public.providers SET provider_code = 'CLEP' WHERE provider_code IS NULL AND name ILIKE '%clep%';
UPDATE public.providers SET provider_code = 'UMPI' WHERE provider_code IS NULL AND name ILIKE '%university of maine%';
UPDATE public.providers SET provider_code = 'SNHU' WHERE provider_code IS NULL AND name ILIKE '%southern new hampshire%';
UPDATE public.providers SET provider_code = 'OUTLIER' WHERE provider_code IS NULL AND name ILIKE '%outlier%';
UPDATE public.providers SET provider_code = 'COURSERA' WHERE provider_code IS NULL AND name ILIKE '%coursera%';
UPDATE public.providers SET provider_code = 'UDACITY' WHERE provider_code IS NULL AND name ILIKE '%udacity%';

-- Insert providers
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Thomas Edison State University', 'university', 'TESU') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Western Governors University', 'university', 'WGU') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Sophia Learning', 'mooc', 'SOPHIA') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Study.com', 'mooc', 'STUDY') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'CLEP', 'testing_center', 'CLEP') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'University of Maine Presque Isle', 'university', 'UMPI') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Southern New Hampshire University', 'university', 'SNHU') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Outlier.org', 'mooc', 'OUTLIER') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Coursera', 'mooc', 'COURSERA') ON CONFLICT (provider_code) DO NOTHING;
INSERT INTO public.providers (id, name, type, provider_code) VALUES (gen_random_uuid(), 'Udacity', 'mooc', 'UDACITY') ON CONFLICT (provider_code) DO NOTHING;

-- Insert requirement catalog
INSERT INTO public.requirement_catalog (canon_req_code, title, area, level_hint, credits_typical, description) VALUES 
('ENG-101','English Composition I','Written Communication',100,3,'Introductory academic writing and composition'),
('ENG-102','English Composition II','Written Communication',100,3,'Advanced composition and research writing'),
('MAT-121','College Algebra','Mathematics',100,3,'Fundamental algebraic concepts and problem-solving'),
('STA-201','Statistics','Mathematics',200,3,'Introduction to statistical analysis and probability'),
('PSY-101','Introduction to Psychology','Social Sciences',100,3,'Survey of psychological principles and theories'),
('SOC-101','Introduction to Sociology','Social Sciences',100,3,'Fundamentals of sociological theory and research'),
('HIS-101','World History I','Humanities',100,3,'Ancient and medieval world civilizations'),
('PHI-101','Introduction to Philosophy','Humanities',100,3,'Survey of major philosophical questions and thinkers'),
('BIO-101','General Biology','Natural Sciences',100,4,'Cell biology, genetics, and evolution with lab'),
('PHY-101','General Physics I','Natural Sciences',100,4,'Mechanics and thermodynamics with lab'),
('ART-101','Art Appreciation','Arts',100,3,'Survey of visual arts history and criticism'),
('MUS-101','Music Appreciation','Arts',100,3,'Introduction to music history and theory'),
('GEN-ELEC','General Elective','Elective',0,3,'Open elective credit - any subject')
ON CONFLICT (canon_req_code) DO UPDATE SET title=EXCLUDED.title, area=EXCLUDED.area, level_hint=EXCLUDED.level_hint, credits_typical=EXCLUDED.credits_typical, description=EXCLUDED.description;

-- Insert partner policies
INSERT INTO public.partner_policies (partner_code, partner_name, max_alt_credits, min_residency_credits, upper_division_min, notes) VALUES 
('TESU','Thomas Edison State University',90,30,18,'Very ACE-friendly; capstone in-residence; flexible transfer'),
('WGU','Western Governors University',75,45,30,'Competency-based; accepts many alternative credits; term-based residency'),
('UMPI','University of Maine Presque Isle',90,30,21,'YourPace program; 8-week terms; transfer-friendly'),
('SNHU','Southern New Hampshire University',90,30,30,'Online-focused; accepts ACE credits; frequent start dates')
ON CONFLICT (partner_code) DO UPDATE SET partner_name=EXCLUDED.partner_name, max_alt_credits=EXCLUDED.max_alt_credits, min_residency_credits=EXCLUDED.min_residency_credits, upper_division_min=EXCLUDED.upper_division_min, notes=EXCLUDED.notes;

-- Insert credit transfer rules
INSERT INTO public.credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, effective_from) VALUES 
('SOPHIA','SOPH-ENG-101','TESU','ENG-101','accepted','ACE',0.95, CURRENT_DATE),
('SOPHIA','SOPH-ENG-102','TESU','ENG-102','accepted','ACE',0.95, CURRENT_DATE),
('STUDY','STUDY-ENG-101','TESU','ENG-101','accepted','ACE',0.92, CURRENT_DATE),
('CLEP','CLEP-COMP','TESU','ENG-102','accepted','CLEP',0.98, CURRENT_DATE),
('SOPHIA','SOPH-ALG-101','TESU','MAT-121','accepted','ACE',0.93, CURRENT_DATE),
('STUDY','STUDY-ALG-101','TESU','MAT-121','accepted','ACE',0.92, CURRENT_DATE),
('CLEP','CLEP-ALG','TESU','MAT-121','accepted','CLEP',0.98, CURRENT_DATE),
('SOPHIA','SOPH-STAT-201','TESU','STA-201','accepted','ACE',0.92, CURRENT_DATE),
('SOPHIA','SOPH-PSY-101','TESU','PSY-101','accepted','ACE',0.90, CURRENT_DATE),
('CLEP','CLEP-PSY','TESU','PSY-101','accepted','CLEP',0.97, CURRENT_DATE),
('SOPHIA','SOPH-SOC-101','TESU','SOC-101','accepted','ACE',0.89, CURRENT_DATE),
('SOPHIA','SOPH-COMM-101','TESU',NULL,'elective','ACE',0.60, CURRENT_DATE),
('SOPHIA','SOPH-ENG-101','WGU','ENG-1XX','accepted','ACE',0.85, CURRENT_DATE),
('SOPHIA','SOPH-STAT-201','WGU','STAT-1XX','accepted','ACE',0.84, CURRENT_DATE),
('STUDY','STUDY-DB-INTRO','WGU',NULL,'elective','ACE',0.70, CURRENT_DATE),
('SOPHIA','SOPH-COMM-101','WGU',NULL,'rejected','heuristic',0.50, CURRENT_DATE)
ON CONFLICT (source_institution, source_course_code, target_institution) DO UPDATE SET target_course_code=EXCLUDED.target_course_code, acceptance_status=EXCLUDED.acceptance_status, rule_source=EXCLUDED.rule_source, confidence=EXCLUDED.confidence;

-- Insert option exclusions
WITH course_ids AS (
  SELECT id, code FROM public.marketplace_courses WHERE code IN ('SOPH-ALG-101', 'STUDY-ALG-101', 'CLEP-ALG')
),
pairs AS (
  SELECT 
    LEAST(a.id, b.id) as option_a_id,
    GREATEST(a.id, b.id) as option_b_id,
    'Equivalent College Algebra credit - only one counts' as reason
  FROM course_ids a CROSS JOIN course_ids b WHERE a.code < b.code
)
INSERT INTO public.option_exclusions (option_a_id, option_b_id, reason)
SELECT option_a_id, option_b_id, reason FROM pairs
ON CONFLICT (option_a_id, option_b_id) DO NOTHING;
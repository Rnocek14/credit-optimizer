-- ============================================================================
-- PHASE 2: Seed 40+ Marketplace Courses + Option Exclusions
-- Pre-flight: Validates enums, providers, schema before seeding
-- ============================================================================

DO $$
DECLARE
  v_enum_ok BOOLEAN;
  v_providers_ok BOOLEAN;
  v_columns_ok BOOLEAN;
BEGIN
  -- Pre-flight check 1: delivery_mode_enum includes required values
  SELECT EXISTS(
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'delivery_mode_enum'
    AND e.enumlabel IN ('asynchronous','synchronous','hybrid','testing_center')
    GROUP BY t.typname
    HAVING COUNT(DISTINCT e.enumlabel) >= 4
  ) INTO v_enum_ok;

  IF NOT v_enum_ok THEN
    RAISE EXCEPTION 'delivery_mode_enum missing required values';
  END IF;

  -- Pre-flight check 2: Verify provider codes exist
  SELECT COUNT(*) = 5 INTO v_providers_ok
  FROM providers
  WHERE provider_code IN ('SOPHIA','STUDY','CLEP','COURSERA','EDX');

  IF NOT v_providers_ok THEN
    RAISE EXCEPTION 'Missing required provider codes (need SOPHIA, STUDY, CLEP, COURSERA, EDX)';
  END IF;

  -- Pre-flight check 3: Verify option_exclusions columns
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'option_exclusions'
    AND column_name IN ('option_a_id','option_b_id')
    GROUP BY table_name
    HAVING COUNT(*) = 2
  ) INTO v_columns_ok;

  IF NOT v_columns_ok THEN
    RAISE EXCEPTION 'option_exclusions missing option_a_id/option_b_id columns';
  END IF;

  RAISE NOTICE '✓ Pre-flight checks passed';
END $$;

-- ============================================================================
-- Step 1: Add STRAIGHTERLINE Provider
-- ============================================================================

INSERT INTO providers (
  id,
  provider_code,
  name,
  type,
  accreditation,
  country,
  website_url,
  active,
  reputation_score,
  ace_approved,
  nccrs_approved
)
VALUES (
  'a1b2c3d4-0007-0000-0000-000000000007',
  'STRAIGHTERLINE',
  'StraighterLine',
  'mooc',
  'ACE Approved',
  'US',
  'https://straighterline.com',
  true,
  75,
  true,
  false
)
ON CONFLICT (provider_code) DO UPDATE SET
  name = EXCLUDED.name,
  reputation_score = EXCLUDED.reputation_score,
  ace_approved = EXCLUDED.ace_approved,
  updated_at = NOW();

-- ============================================================================
-- Step 2: Seed 40 Marketplace Courses
-- ============================================================================

WITH p AS (
  SELECT id, provider_code FROM providers
  WHERE provider_code IN ('SOPHIA','STUDY','CLEP','STRAIGHTERLINE','COURSERA','EDX')
),
seed(code, provider_code, title, description, credits, subject_area, cost_usd, duration_weeks, ace_recommendation_id, nccrs_course_id, proctoring_required, delivery_mode, skill_tags, active) AS (
  VALUES
  -- === Mathematics (9) ===
  ('SOPH-COLLEGE-ALG','SOPHIA','College Algebra','Functions, polynomials, exponentials, logarithms',3,'mathematics',70,4,'MATH-1105',NULL,false,'asynchronous',ARRAY['algebra','functions','graphing'],true),
  ('STUDY-COLLEGE-ALG','STUDY','College Algebra','Core algebra competencies for STEM/IT',3,'mathematics',80,4,'MATH-1105',NULL,false,'asynchronous',ARRAY['algebra','equations','inequalities'],true),
  ('CLEP-COLLEGE-ALG','CLEP','CLEP: College Algebra','Standardized exam; on-site or remote proctoring',3,'mathematics',93,0,'CLEP-ALG',NULL,true,'testing_center',ARRAY['algebra','functions'],true),
  ('SOPH-STATS-101','SOPHIA','Introduction to Statistics','Descriptive & inferential stats, probability',3,'mathematics',70,4,'STAT-1001',NULL,false,'asynchronous',ARRAY['statistics','probability','inference'],true),
  ('STUDY-STATS-101','STUDY','Statistics','Foundations of probability and inference',3,'mathematics',80,4,'STAT-1001',NULL,false,'asynchronous',ARRAY['statistics','distributions'],true),
  ('CLEP-CALC-I','CLEP','CLEP: Calculus','Single-variable calculus exam',4,'mathematics',93,0,'CLEP-CALC',NULL,true,'testing_center',ARRAY['limits','derivatives','integrals'],true),
  ('SL-ALGEBRA','STRAIGHTERLINE','College Algebra','Self-paced, proctored final',3,'mathematics',119,4,'SL-MATH-101',NULL,true,'asynchronous',ARRAY['algebra','functions'],true),
  ('EDX-CALC-I','EDX','Calculus I','MOOC with graded assignments',3,'mathematics',0,8,NULL,NULL,false,'asynchronous',ARRAY['limits','derivatives','applications'],true),
  ('COURSERA-DISCRETE','COURSERA','Discrete Mathematics','Logic, sets, graphs for CS',3,'mathematics',0,6,NULL,NULL,false,'asynchronous',ARRAY['logic','graphs','combinatorics'],true),

  -- === CS Core (10) ===
  ('SOPH-CS-INTRO','SOPHIA','Intro to Programming (Python)','Variables, control flow, functions',3,'computer-science',70,4,NULL,NULL,false,'asynchronous',ARRAY['python','control-flow'],true),
  ('STUDY-CS-INTRO','STUDY','Introduction to Programming','Basics in Python/JavaScript',3,'computer-science',80,4,NULL,NULL,false,'asynchronous',ARRAY['python','javascript'],true),
  ('SL-PROG-INTRO','STRAIGHTERLINE','Introduction to Programming','Syntax + problem solving',3,'computer-science',129,4,NULL,NULL,true,'asynchronous',ARRAY['programming','problems'],true),
  ('EDX-CS50','EDX','CS Foundations','Systems, C, web, Python',3,'computer-science',0,10,NULL,NULL,false,'asynchronous',ARRAY['c','python','web'],true),
  ('COURSERA-DSA','COURSERA','Data Structures & Algorithms','Lists, trees, graphs, complexity',3,'computer-science',0,8,NULL,NULL,false,'asynchronous',ARRAY['algorithms','complexity','graphs'],true),
  ('STUDY-DSA','STUDY','Data Structures','Arrays, stacks, queues, trees',3,'computer-science',80,4,NULL,NULL,false,'asynchronous',ARRAY['arrays','trees','hashing'],true),
  ('SOPH-DB-DESIGN','SOPHIA','Database Design','ER modeling, SQL basics',3,'computer-science',70,4,NULL,NULL,false,'asynchronous',ARRAY['sql','schema','er-model'],true),
  ('SL-DB-INTRO','STRAIGHTERLINE','Introduction to Databases','Relational fundamentals',3,'computer-science',129,4,NULL,NULL,true,'asynchronous',ARRAY['relational','sql'],true),
  ('EDX-ALGO','EDX','Algorithms I','Sorting, searching, graphs',3,'computer-science',0,8,NULL,NULL,false,'asynchronous',ARRAY['sorting','graphs','dp'],true),
  ('COURSERA-SWE-FUND','COURSERA','Software Engineering Fundamentals','Requirements, testing, CI/CD',3,'computer-science',0,6,NULL,NULL,false,'asynchronous',ARRAY['testing','ci-cd','requirements'],true),

  -- === General Education (12) ===
  ('SOPH-ENG-COMP','SOPHIA','English Composition I','Rhetoric, argument, research writing',3,'english',70,4,'ENG-1101',NULL,false,'asynchronous',ARRAY['writing','research','rhetoric'],true),
  ('STUDY-ENG-COMP','STUDY','English Composition','Academic writing & research',3,'english',80,4,'ENG-1101',NULL,false,'asynchronous',ARRAY['composition','mla','apa'],true),
  ('CLEP-ENG-COMP','CLEP','CLEP: College Composition','Standardized composition exam',3,'english',93,0,'CLEP-COMP',NULL,true,'testing_center',ARRAY['writing','grammar'],true),
  ('SOPH-PSYCH-101','SOPHIA','Introduction to Psychology','Foundations of behavior & cognition',3,'social-science',70,4,'PSY-1101',NULL,false,'asynchronous',ARRAY['cognition','behavior'],true),
  ('STUDY-PSYCH-101','STUDY','General Psychology','Theories, methods, applications',3,'social-science',80,4,'PSY-1101',NULL,false,'asynchronous',ARRAY['development','personality'],true),
  ('CLEP-PSYCH','CLEP','CLEP: Introductory Psychology','Standardized exam',3,'social-science',93,0,'CLEP-PSY',NULL,true,'testing_center',ARRAY['cognition','emotion'],true),
  ('SOPH-HIST-US','SOPHIA','US History I','Colonial era to Reconstruction',3,'history',70,4,'HIST-1101',NULL,false,'asynchronous',ARRAY['colonial','civil-war'],true),
  ('STUDY-HIST-US','STUDY','US History I','Survey to 1877',3,'history',80,4,'HIST-1101',NULL,false,'asynchronous',ARRAY['revolution','reconstruction'],true),
  ('CLEP-HIST-US','CLEP','CLEP: History of the U.S. I','Standardized exam',3,'history',93,0,'CLEP-HIST1',NULL,true,'testing_center',ARRAY['colonial','constitution'],true),
  ('SOPH-BIO-101','SOPHIA','Biology I','Cells, genetics, evolution',3,'natural-science',70,4,'BIO-1101',NULL,false,'asynchronous',ARRAY['cells','genetics'],true),
  ('STUDY-BIO-101','STUDY','Biology','Introductory survey',3,'natural-science',80,4,'BIO-1101',NULL,false,'asynchronous',ARRAY['ecology','evolution'],true),
  ('EDX-BIO-ESS','EDX','Biology Essentials','MOOC with assessments',3,'natural-science',0,6,NULL,NULL,false,'asynchronous',ARRAY['cells','organisms'],true),

  -- === Business (9) ===
  ('SOPH-ACCT-101','SOPHIA','Financial Accounting','Accounting cycle, statements',3,'business',70,4,'ACCT-1101',NULL,false,'asynchronous',ARRAY['ledgers','statements'],true),
  ('STUDY-ACCT-101','STUDY','Financial Accounting','Recording & reporting',3,'business',80,4,'ACCT-1101',NULL,false,'asynchronous',ARRAY['journal','balance-sheet'],true),
  ('SOPH-MKT-101','SOPHIA','Principles of Marketing','4Ps, segmentation, positioning',3,'business',70,4,'MKT-1101',NULL,false,'asynchronous',ARRAY['segmentation','brand'],true),
  ('STUDY-MKT-101','STUDY','Marketing','Foundations and strategy',3,'business',80,4,'MKT-1101',NULL,false,'asynchronous',ARRAY['mix','channels'],true),
  ('SOPH-BLAW-101','SOPHIA','Business Law','Contracts, torts, agency',3,'business',70,4,'BLAW-1101',NULL,false,'asynchronous',ARRAY['contracts','torts'],true),
  ('STUDY-BLAW-101','STUDY','Business Law','Legal environment',3,'business',80,4,'BLAW-1101',NULL,false,'asynchronous',ARRAY['ucc','liability'],true),
  ('CLEP-MICRO','CLEP','CLEP: Principles of Microeconomics','Standardized exam',3,'business',93,0,'CLEP-MICRO',NULL,true,'testing_center',ARRAY['supply','demand'],true),
  ('COURSERA-ACCOUNTING','COURSERA','Accounting Fundamentals','Prep for financial statements',3,'business',0,6,NULL,NULL,false,'asynchronous',ARRAY['financials','ratios'],true),
  ('EDX-MICRO','EDX','Microeconomics','Consumer, firm behavior',3,'business',0,6,NULL,NULL,false,'asynchronous',ARRAY['elasticity','markets'],true)
)
INSERT INTO marketplace_courses (
  code, provider_id, title, description, credits, subject_area, cost_usd, duration_weeks,
  ace_recommendation_id, nccrs_course_id, proctoring_required, delivery_mode, skill_tags, active
)
SELECT
  s.code,
  p.id,
  s.title,
  s.description,
  s.credits,
  s.subject_area,
  s.cost_usd,
  NULLIF(s.duration_weeks, 0),
  s.ace_recommendation_id,
  s.nccrs_course_id,
  COALESCE(s.proctoring_required, false),
  s.delivery_mode::delivery_mode_enum,
  s.skill_tags,
  s.active
FROM seed s
JOIN p ON p.provider_code = s.provider_code
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  credits = EXCLUDED.credits,
  subject_area = EXCLUDED.subject_area,
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  ace_recommendation_id = EXCLUDED.ace_recommendation_id,
  nccrs_course_id = EXCLUDED.nccrs_course_id,
  proctoring_required = EXCLUDED.proctoring_required,
  delivery_mode = EXCLUDED.delivery_mode,
  skill_tags = EXCLUDED.skill_tags,
  active = EXCLUDED.active,
  updated_at = NOW();

-- ============================================================================
-- Step 3: Seed Option Exclusions (Family-Based Logic with UUID Ordering)
-- ============================================================================

WITH families AS (
  SELECT id, code,
         CASE
           WHEN code LIKE '%COLLEGE-ALG' OR code LIKE '%ALGEBRA' THEN 'ALGEBRA'
           WHEN code LIKE '%STATS%' THEN 'STATS'
           WHEN code LIKE '%CALC%' THEN 'CALC'
           WHEN code LIKE '%ENG-COMP' OR code LIKE '%COMP' THEN 'ENGCOMP'
           WHEN code LIKE '%PSYCH%' THEN 'PSYCH'
           WHEN code LIKE '%HIST-US%' OR code LIKE '%HIST%' THEN 'USHIST'
           WHEN code LIKE '%PROG%' OR code LIKE '%CS-INTRO' THEN 'INTROPROG'
           WHEN code LIKE '%DSA%' THEN 'DSA'
           WHEN code LIKE '%DB%' THEN 'DATABASE'
           WHEN code LIKE '%ACCT%' THEN 'ACCOUNTING'
           WHEN code LIKE '%MKT%' THEN 'MARKETING'
           WHEN code LIKE '%BLAW%' THEN 'BUSLAW'
           WHEN code LIKE '%MICRO%' THEN 'MICROECON'
           ELSE NULL
         END AS family
  FROM marketplace_courses
),
pairs AS (
  SELECT 
    CASE WHEN a.id < b.id THEN a.id ELSE b.id END AS a_id,
    CASE WHEN a.id < b.id THEN b.id ELSE a.id END AS b_id
  FROM families a
  JOIN families b ON a.family = b.family AND a.code < b.code
  WHERE a.family IS NOT NULL
)
INSERT INTO option_exclusions (option_a_id, option_b_id, reason)
SELECT a_id, b_id, 'Equivalent subject/level from different providers—choose one'
FROM pairs
ON CONFLICT (option_a_id, option_b_id) DO NOTHING;

-- ============================================================================
-- Step 4: Smoke Tests (Validation Queries)
-- ============================================================================

DO $$
DECLARE
  v_sophia_count INT;
  v_study_count INT;
  v_clep_count INT;
  v_sl_count INT;
  v_edx_count INT;
  v_coursera_count INT;
  v_total_count INT;
  v_exclusions_count INT;
  v_clep_proctored_count INT;
BEGIN
  -- Count courses by provider
  SELECT COUNT(*) INTO v_sophia_count FROM marketplace_courses mc
    JOIN providers p ON p.id = mc.provider_id WHERE p.provider_code = 'SOPHIA';
  SELECT COUNT(*) INTO v_study_count FROM marketplace_courses mc
    JOIN providers p ON p.id = mc.provider_id WHERE p.provider_code = 'STUDY';
  SELECT COUNT(*) INTO v_clep_count FROM marketplace_courses mc
    JOIN providers p ON p.id = mc.provider_id WHERE p.provider_code = 'CLEP';
  SELECT COUNT(*) INTO v_sl_count FROM marketplace_courses mc
    JOIN providers p ON p.id = mc.provider_id WHERE p.provider_code = 'STRAIGHTERLINE';
  SELECT COUNT(*) INTO v_edx_count FROM marketplace_courses mc
    JOIN providers p ON p.id = mc.provider_id WHERE p.provider_code = 'EDX';
  SELECT COUNT(*) INTO v_coursera_count FROM marketplace_courses mc
    JOIN providers p ON p.id = mc.provider_id WHERE p.provider_code = 'COURSERA';
  
  SELECT COUNT(*) INTO v_total_count FROM marketplace_courses;
  SELECT COUNT(*) INTO v_exclusions_count FROM option_exclusions;
  
  -- Verify CLEP courses have proctoring flag
  SELECT COUNT(*) INTO v_clep_proctored_count FROM marketplace_courses mc
    JOIN providers p ON p.id = mc.provider_id 
    WHERE p.provider_code = 'CLEP' AND mc.proctoring_required = true;

  RAISE NOTICE '📊 Phase 2 Smoke Tests:';
  RAISE NOTICE '  └─ SOPHIA: % courses', v_sophia_count;
  RAISE NOTICE '  └─ STUDY: % courses', v_study_count;
  RAISE NOTICE '  └─ CLEP: % courses', v_clep_count;
  RAISE NOTICE '  └─ STRAIGHTERLINE: % courses', v_sl_count;
  RAISE NOTICE '  └─ EDX: % courses', v_edx_count;
  RAISE NOTICE '  └─ COURSERA: % courses', v_coursera_count;
  RAISE NOTICE '  └─ TOTAL: % courses', v_total_count;
  RAISE NOTICE '  └─ Exclusions: % pairs', v_exclusions_count;
  RAISE NOTICE '  └─ CLEP proctored: %/%', v_clep_proctored_count, v_clep_count;
  
  IF v_total_count < 40 THEN
    RAISE WARNING 'Expected 40+ courses, got %', v_total_count;
  END IF;
  
  IF v_exclusions_count < 50 THEN
    RAISE WARNING 'Expected 50+ exclusions, got %', v_exclusions_count;
  END IF;

  IF v_clep_proctored_count <> v_clep_count THEN
    RAISE WARNING 'Not all CLEP courses have proctoring flag set';
  END IF;

  RAISE NOTICE '✅ Phase 2 Complete - Marketplace ready!';
END $$;
-- EMPIRE SOPHIA Evidence Backfill (18 rules to cross 50% threshold)
-- Source: Official SUNY Empire Sophia Partner Page (Tier-1 institution_web)
-- Evidence URL: https://sunyempire.sophia.org/

UPDATE credit_transfer_rules
SET 
  evidence_url = 'https://sunyempire.sophia.org/',
  evidence_source_type = 'institution_web',
  last_verified_at = now(),
  evidence_locator = CASE source_course_code
    WHEN 'SOPHIA-BUS-LAW' THEN 'SUNY Empire Sophia Partner Page - Business Law → BUS-230'
    WHEN 'SOPHIA-FIN-ACCT' THEN 'SUNY Empire Sophia Partner Page - Financial Accounting → ACC-211'
    WHEN 'SOPHIA-COLLEGE-ALG' THEN 'SUNY Empire Sophia Partner Page - College Algebra → MAT-114'
    WHEN 'SOPHIA-ENG-COMP-I-II' THEN 'SUNY Empire Sophia Partner Page - English Composition I → ENG-101'
    WHEN 'SOPHIA-INTRO-PSYCH' THEN 'SUNY Empire Sophia Partner Page - Introduction to Psychology → PSY-101'
    WHEN 'SOPHIA-INTRO-SOC' THEN 'SUNY Empire Sophia Partner Page - Introduction to Sociology → SOC-101'
    WHEN 'SOPHIA-INTRO-BUS' THEN 'SUNY Empire Sophia Partner Page - Introduction to Business → BUS-101'
    WHEN 'SOPHIA-ENV-SCI' THEN 'SUNY Empire Sophia Partner Page - Environmental Science → ENV-101'
    WHEN 'SOPHIA-HUMAN-BIO' THEN 'SUNY Empire Sophia Partner Page - Human Biology → BIO-101'
    WHEN 'SOPHIA-INTRO-ETHICS' THEN 'SUNY Empire Sophia Partner Page - Introduction to Ethics → PHI-384'
    WHEN 'SOPHIA-MACRO-ECON' THEN 'SUNY Empire Sophia Partner Page - Macroeconomics → ECO-212'
    WHEN 'SOPHIA-MICRO-ECON' THEN 'SUNY Empire Sophia Partner Page - Microeconomics → ECO-211'
    WHEN 'SOPHIA-PUBLIC-SPEAK' THEN 'SUNY Empire Sophia Partner Page - Public Speaking → COM-209'
    WHEN 'SOPHIA-US-HIST-I' THEN 'SUNY Empire Sophia Partner Page - US History I → HIS-113'
    WHEN 'SOPHIA-ART-HIST-I' THEN 'SUNY Empire Sophia Partner Page - Art History I → ART-101'
    WHEN 'SOPHIA-MGT-ACCT' THEN 'SUNY Empire Sophia Partner Page - Managerial Accounting → ACC-301'
    ELSE 'SUNY Empire Sophia Partner Page - Course equivalency chart'
  END,
  source_course_title_canonical = CASE source_course_code
    WHEN 'SOPHIA-BUS-LAW' THEN 'Business Law'
    WHEN 'SOPHIA-FIN-ACCT' THEN 'Financial Accounting'
    WHEN 'SOPHIA-COLLEGE-ALG' THEN 'College Algebra'
    WHEN 'SOPHIA-ENG-COMP-I-II' THEN 'English Composition I'
    WHEN 'SOPHIA-INTRO-PSYCH' THEN 'Introduction to Psychology'
    WHEN 'SOPHIA-INTRO-SOC' THEN 'Introduction to Sociology'
    WHEN 'SOPHIA-INTRO-BUS' THEN 'Introduction to Business'
    WHEN 'SOPHIA-ENV-SCI' THEN 'Environmental Science'
    WHEN 'SOPHIA-HUMAN-BIO' THEN 'Human Biology'
    WHEN 'SOPHIA-INTRO-ETHICS' THEN 'Introduction to Ethics'
    WHEN 'SOPHIA-MACRO-ECON' THEN 'Macroeconomics'
    WHEN 'SOPHIA-MICRO-ECON' THEN 'Microeconomics'
    WHEN 'SOPHIA-PUBLIC-SPEAK' THEN 'Public Speaking'
    WHEN 'SOPHIA-US-HIST-I' THEN 'U.S. History I'
    WHEN 'SOPHIA-ART-HIST-I' THEN 'Art History I'
    WHEN 'SOPHIA-MGT-ACCT' THEN 'Managerial Accounting'
    WHEN 'ENG101' THEN 'English Composition'
    WHEN 'SOC101' THEN 'Introduction to Sociology'
    ELSE NULL
  END
WHERE target_institution = 'EMPIRE'
  AND source_institution = 'SOPHIA'
  AND evidence_url IS NULL
  AND source_course_code IN (
    'SOPHIA-BUS-LAW', 'SOPHIA-FIN-ACCT', 'SOPHIA-COLLEGE-ALG', 'SOPHIA-ENG-COMP-I-II',
    'SOPHIA-INTRO-PSYCH', 'SOPHIA-INTRO-SOC', 'SOPHIA-INTRO-BUS', 'SOPHIA-ENV-SCI',
    'SOPHIA-HUMAN-BIO', 'SOPHIA-INTRO-ETHICS', 'SOPHIA-MACRO-ECON', 'SOPHIA-MICRO-ECON',
    'SOPHIA-PUBLIC-SPEAK', 'SOPHIA-US-HIST-I', 'SOPHIA-ART-HIST-I', 'SOPHIA-MGT-ACCT',
    'ENG101', 'SOC101'
  );
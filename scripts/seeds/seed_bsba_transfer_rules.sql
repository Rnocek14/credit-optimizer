-- Seed credit transfer rules for BSBA template courses
-- Sophia Learning → TESU transfer agreements

INSERT INTO credit_transfer_rules 
  (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence)
VALUES
  -- Year 1: General Education - Sophia courses
  ('SOPHIA', 'SOPHIA-ENG-COMP-I-II', 'TESU', 'ENG-101', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-US-HIST-I', 'TESU', 'HIS-113', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-COLLEGE-ALG', 'TESU', 'MAT-121', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-INTRO-ETHICS', 'TESU', 'PHI-384', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-ART-HIST-I', 'TESU', 'ART-101', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-INTRO-PSYCH', 'TESU', 'PSY-101', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-INTRO-SOC', 'TESU', 'SOC-101', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-HUMAN-BIO', 'TESU', 'BIO-101', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-ENV-SCI', 'TESU', 'ENV-101', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'SOPHIA-PUBLIC-SPEAK', 'TESU', 'COM-209', 'accepted', 'ACE Credit', 0.95),

  -- Year 2: Business Core - Study.com courses
  ('STUDYCOM', 'SDC-PRIN-MGMT', 'TESU', 'MAN-321', 'accepted', 'ACE Credit', 0.92),
  ('STUDYCOM', 'SDC-PRIN-MKT', 'TESU', 'MAR-301', 'accepted', 'ACE Credit', 0.92),
  ('STUDYCOM', 'SDC-FIN-ACCT', 'TESU', 'ACC-102', 'accepted', 'ACE Credit', 0.92),
  ('STUDYCOM', 'SDC-MGT-ACCT', 'TESU', 'ACC-301', 'accepted', 'ACE Credit', 0.92),
  ('STUDYCOM', 'SDC-MICRO-ECON', 'TESU', 'ECO-211', 'accepted', 'ACE Credit', 0.92),
  ('STUDYCOM', 'SDC-MACRO-ECON', 'TESU', 'ECO-212', 'accepted', 'ACE Credit', 0.92),
  ('STUDYCOM', 'SDC-INFO-SYS', 'TESU', 'CIS-301', 'accepted', 'ACE Credit', 0.92),

  -- Year 3: Upper Division Business - Study.com courses
  ('STUDYCOM', 'SDC-BUS-ETH', 'TESU', 'BUS-331', 'accepted', 'ACE Credit', 0.90),
  ('STUDYCOM', 'SDC-CORP-FIN', 'TESU', 'FIN-321', 'accepted', 'ACE Credit', 0.90),
  ('STUDYCOM', 'SDC-BUS-LAW', 'TESU', 'BUS-311', 'accepted', 'ACE Credit', 0.90),
  ('STUDYCOM', 'SDC-HR-MGMT', 'TESU', 'HRM-301', 'accepted', 'ACE Credit', 0.90),
  ('STUDYCOM', 'SDC-PROJ-MGMT', 'TESU', 'MAN-341', 'accepted', 'ACE Credit', 0.90),
  ('STUDYCOM', 'SDC-SUPPLY-CHAIN', 'TESU', 'OPM-301', 'accepted', 'ACE Credit', 0.90),
  ('STUDYCOM', 'SDC-BUS-ANALYTICS', 'TESU', 'BUS-351', 'accepted', 'ACE Credit', 0.90),

  -- Year 4: Business Electives - Study.com courses
  ('STUDYCOM', 'SDC-ENTREPRENEUR', 'TESU', 'ENT-301', 'accepted', 'ACE Credit', 0.88),
  ('STUDYCOM', 'SDC-DIGITAL-MKT', 'TESU', 'MAR-331', 'accepted', 'ACE Credit', 0.88),
  ('STUDYCOM', 'SDC-CONSUMER-BEH', 'TESU', 'MAR-321', 'accepted', 'ACE Credit', 0.88),
  ('STUDYCOM', 'SDC-RESEARCH-METH', 'TESU', 'BUS-401', 'accepted', 'ACE Credit', 0.88),
  ('STUDYCOM', 'SDC-DATA-DECISIONS', 'TESU', 'BUS-411', 'accepted', 'ACE Credit', 0.88)

ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE credit_transfer_rules IS 'Credit transfer rules seeded with BSBA template courses (Sophia + Study.com → TESU)';

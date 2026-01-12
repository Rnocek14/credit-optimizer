
-- WGU Transfer Rules Expansion: ~40 rules (accept + conditional only, no unsourced rejections)
-- Using normalized source_institution names: SOPHIA, STUDYCOM, STRAIGHTERLINE
-- rule_type must be: course_equivalency, provider_acceptance, or policy_override

-- ============================================
-- BUCKET A: High-confidence accepts (25 rules)
-- ============================================

-- SOPHIA Gen Ed Staples (12 rules)
INSERT INTO credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, rule_type)
VALUES
  ('SOPHIA', 'SOPHIA-ENG-COMP-I-II', 'WGU', 'ENG-1XX', 'accepted', 'ACE Credit', 0.92, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-COLLEGE-ALG', 'WGU', 'MAT-1XX', 'accepted', 'ACE Credit', 0.92, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-INTRO-STATS', 'WGU', 'STAT-1XX', 'accepted', 'ACE Credit', 0.92, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-INTRO-PSYCH', 'WGU', 'PSY-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-INTRO-SOC', 'WGU', 'SOC-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-US-HIST-I', 'WGU', 'HIS-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-US-HIST-II', 'WGU', 'HIS-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-PUBLIC-SPEAK', 'WGU', 'COM-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-INTRO-ETHICS', 'WGU', 'PHI-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-ENV-SCI', 'WGU', 'SCI-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-HUMAN-BIO', 'WGU', 'BIO-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-ART-HIST-I', 'WGU', 'ART-1XX', 'accepted', 'ACE Credit', 0.85, 'course_equivalency')
ON CONFLICT DO NOTHING;

-- STUDYCOM Gen Ed & Lower Division (10 rules)
INSERT INTO credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, rule_type)
VALUES
  ('STUDYCOM', 'SDC-ENG-COMP', 'WGU', 'ENG-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('STUDYCOM', 'SDC-COLLEGE-ALG', 'WGU', 'MAT-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('STUDYCOM', 'SDC-INTRO-STATS', 'WGU', 'STAT-1XX', 'accepted', 'ACE Credit', 0.90, 'course_equivalency'),
  ('STUDYCOM', 'SDC-INTRO-PSYCH', 'WGU', 'PSY-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('STUDYCOM', 'SDC-INTRO-SOC', 'WGU', 'SOC-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('STUDYCOM', 'SDC-US-HIST-I', 'WGU', 'HIS-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('STUDYCOM', 'SDC-PUBLIC-SPEAK', 'WGU', 'COM-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('STUDYCOM', 'SDC-ETHICS', 'WGU', 'PHI-1XX', 'accepted', 'ACE Credit', 0.85, 'course_equivalency'),
  ('STUDYCOM', 'SDC-ENV-SCI', 'WGU', 'SCI-1XX', 'accepted', 'ACE Credit', 0.85, 'course_equivalency'),
  ('STUDYCOM', 'SDC-BIO-101', 'WGU', 'BIO-1XX', 'accepted', 'ACE Credit', 0.85, 'course_equivalency')
ON CONFLICT DO NOTHING;

-- STRAIGHTERLINE Gen Ed (3 rules)
INSERT INTO credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, rule_type)
VALUES
  ('STRAIGHTERLINE', 'SL-ENG-101', 'WGU', 'ENG-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('STRAIGHTERLINE', 'SL-COLLEGE-ALG', 'WGU', 'MAT-1XX', 'accepted', 'ACE Credit', 0.88, 'course_equivalency'),
  ('STRAIGHTERLINE', 'SL-INTRO-PSYCH', 'WGU', 'PSY-1XX', 'accepted', 'ACE Credit', 0.85, 'course_equivalency')
ON CONFLICT DO NOTHING;

-- ============================================
-- BUCKET B: Conditional / Elective (12 rules)
-- ============================================

-- SOPHIA IT/Business courses (may vary by WGU program)
INSERT INTO credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, rule_type)
VALUES
  ('SOPHIA', 'SOPHIA-INTRO-IT', 'WGU', NULL, 'elective', 'ACE Credit - Program Dependent', 0.75, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-PROJ-MGMT', 'WGU', NULL, 'elective', 'ACE Credit - Program Dependent', 0.75, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-MICROECON', 'WGU', 'ECON-1XX', 'elective', 'ACE Credit - Program Dependent', 0.78, 'course_equivalency'),
  ('SOPHIA', 'SOPHIA-MACROECON', 'WGU', 'ECON-1XX', 'elective', 'ACE Credit - Program Dependent', 0.78, 'course_equivalency')
ON CONFLICT DO NOTHING;

-- STUDYCOM IT/Business courses (program-specific)
INSERT INTO credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, rule_type)
VALUES
  ('STUDYCOM', 'SDC-INTRO-IT', 'WGU', NULL, 'elective', 'ACE Credit - Program Dependent', 0.75, 'course_equivalency'),
  ('STUDYCOM', 'SDC-INTRO-DB', 'WGU', NULL, 'elective', 'ACE Credit - Program Dependent', 0.72, 'course_equivalency'),
  ('STUDYCOM', 'SDC-NETWORK-FUND', 'WGU', NULL, 'elective', 'ACE Credit - Program Dependent', 0.72, 'course_equivalency'),
  ('STUDYCOM', 'SDC-CYBER-SEC', 'WGU', NULL, 'elective', 'ACE Credit - Program Dependent', 0.70, 'course_equivalency'),
  ('STUDYCOM', 'SDC-PRIN-MGMT', 'WGU', 'MGT-1XX', 'elective', 'ACE Credit - Program Dependent', 0.75, 'course_equivalency'),
  ('STUDYCOM', 'SDC-PRIN-MKT', 'WGU', 'MKT-1XX', 'elective', 'ACE Credit - Program Dependent', 0.75, 'course_equivalency'),
  ('STUDYCOM', 'SDC-FIN-ACCT', 'WGU', 'ACC-1XX', 'elective', 'ACE Credit - Program Dependent', 0.75, 'course_equivalency'),
  ('STUDYCOM', 'SDC-MICROECON', 'WGU', 'ECON-1XX', 'elective', 'ACE Credit - Program Dependent', 0.78, 'course_equivalency')
ON CONFLICT DO NOTHING;

-- Add table comment update
COMMENT ON TABLE credit_transfer_rules IS 'Credit transfer rules between institutions. WGU rules expanded 2026-01-12 with ~40 accept/elective rules. No unsourced rejections.';

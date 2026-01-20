-- Evidence backfill for EXCELSIOR SOPHIA-* rules (15 verified mappings from PDF)
-- Note: SOPHIA-MGT-ACCT excluded - not confirmed in PDF text capture

UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.excelsior.edu/wp-content/uploads/2018/01/Sophia-Learning-Course-Equivalency-Excelsior-University-March-2023-1.pdf',
  evidence_source_type = 'institution_pdf',
  last_verified_at = now(),
  source_course_title_canonical = CASE source_course_code
    WHEN 'SOPHIA-ART-HIST-I' THEN 'Art History I'
    WHEN 'SOPHIA-BUS-LAW' THEN 'Business Law'
    WHEN 'SOPHIA-COLLEGE-ALG' THEN 'College Algebra'
    WHEN 'SOPHIA-ENG-COMP-I-II' THEN 'English Composition I/II'
    WHEN 'SOPHIA-ENV-SCI' THEN 'Environmental Science'
    WHEN 'SOPHIA-FIN-ACCT' THEN 'Financial Accounting'
    WHEN 'SOPHIA-HUMAN-BIO' THEN 'Human Biology'
    WHEN 'SOPHIA-INTRO-BUS' THEN 'Introduction to Business'
    WHEN 'SOPHIA-INTRO-ETHICS' THEN 'Introduction to Ethics'
    WHEN 'SOPHIA-INTRO-PSYCH' THEN 'Introduction to Psychology'
    WHEN 'SOPHIA-INTRO-SOC' THEN 'Introduction to Sociology'
    WHEN 'SOPHIA-MACRO-ECON' THEN 'Macroeconomics'
    WHEN 'SOPHIA-MICRO-ECON' THEN 'Microeconomics'
    WHEN 'SOPHIA-PUBLIC-SPEAK' THEN 'Public Speaking'
    WHEN 'SOPHIA-US-HIST-I' THEN 'US History I'
    ELSE source_course_title_canonical
  END,
  evidence_locator = CASE source_course_code
    WHEN 'SOPHIA-ART-HIST-I' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Art History I → ART 101'
    WHEN 'SOPHIA-BUS-LAW' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Business Law → BUS 230'
    WHEN 'SOPHIA-COLLEGE-ALG' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: College Algebra → MAT 114'
    WHEN 'SOPHIA-ENG-COMP-I-II' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: English Composition I/II → ENG 101 + ENG 102'
    WHEN 'SOPHIA-ENV-SCI' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Environmental Science → Natural Sciences Elective'
    WHEN 'SOPHIA-FIN-ACCT' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Financial Accounting → ACC 211'
    WHEN 'SOPHIA-HUMAN-BIO' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Human Biology → BIO 105'
    WHEN 'SOPHIA-INTRO-BUS' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Introduction to Business → Free Elective'
    WHEN 'SOPHIA-INTRO-ETHICS' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Introduction to Ethics → Ethics Requirement'
    WHEN 'SOPHIA-INTRO-PSYCH' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Introduction to Psychology → PSY 101'
    WHEN 'SOPHIA-INTRO-SOC' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Introduction to Sociology → SOC 101'
    WHEN 'SOPHIA-MACRO-ECON' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Macroeconomics → ECO 262'
    WHEN 'SOPHIA-MICRO-ECON' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Microeconomics → ECO 260'
    WHEN 'SOPHIA-PUBLIC-SPEAK' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: Public Speaking → COMM 125'
    WHEN 'SOPHIA-US-HIST-I' THEN 'Excelsior Sophia Equivalency PDF (Aug 2022) p1: US History I → HIS 101'
    ELSE evidence_locator
  END
WHERE target_institution = 'EXCELSIOR'
  AND source_institution = 'SOPHIA'
  AND source_course_code IN (
    'SOPHIA-ART-HIST-I', 'SOPHIA-BUS-LAW', 'SOPHIA-COLLEGE-ALG', 'SOPHIA-ENG-COMP-I-II',
    'SOPHIA-ENV-SCI', 'SOPHIA-FIN-ACCT', 'SOPHIA-HUMAN-BIO', 'SOPHIA-INTRO-BUS',
    'SOPHIA-INTRO-ETHICS', 'SOPHIA-INTRO-PSYCH', 'SOPHIA-INTRO-SOC', 'SOPHIA-MACRO-ECON',
    'SOPHIA-MICRO-ECON', 'SOPHIA-PUBLIC-SPEAK', 'SOPHIA-US-HIST-I'
  );
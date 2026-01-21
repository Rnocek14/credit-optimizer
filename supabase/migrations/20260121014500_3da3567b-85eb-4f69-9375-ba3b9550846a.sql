-- STUDYCOM: Insert remaining aliases (canonicals already exist)
-- Direct insert joining to source_courses

INSERT INTO public.source_course_aliases (
  source_course_id, provider_code, alias_code, alias_kind, confidence, evidence_url, evidence_source_type, evidence_locator
)
SELECT 
  sc.id,
  'STUDYCOM',
  v.alias_code,
  'legacy_short_code',
  v.confidence,
  'https://study.com/',
  'provider_page',
  v.note
FROM (VALUES
  ('SDC-MGMT-ACCT','SDC-MGT-ACCT',0.98,'Variant -> Managerial Accounting'),
  ('SDC-MICROECON','SDC-MICRO-ECON',0.98,'Variant -> Microeconomics'),
  ('STUDY-ALG-101','SDC-COLLEGE-ALG',0.90,'Legacy STUDY-* -> College Algebra'),
  ('STUDY-DB-INTRO','SDC-INTRO-DB',0.95,'Legacy STUDY-* -> Intro to Databases'),
  ('STUDY-ENG-101','SDC-ENG-COMP-I',0.95,'Legacy STUDY-* -> English Comp I'),
  ('SDC-NET-FUND','SDC-NETWORK-FUND',0.98,'Short form -> Network Fundamentals'),
  ('SDC-MARKETING','SDC-PRIN-MKT',0.98,'Generic -> Principles of Marketing'),
  ('SDC-PROB-STATS','SDC-INTRO-STATS',0.98,'Prob/Stats -> Intro to Statistics'),
  ('SDC-JAVA-PROG','SDC-JAVA-PROG',0.95,'Self-alias'),
  ('SDC-LINEAR-ALG','SDC-LINEAR-ALG',0.95,'Self-alias'),
  ('SDC-MOBILE-DEV','SDC-MOBILE-DEV',0.95,'Self-alias'),
  ('SDC-NEGOTIATIONS','SDC-NEGOTIATIONS',0.95,'Self-alias'),
  ('SDC-NETWORK-FUND','SDC-NETWORK-FUND',0.95,'Self-alias'),
  ('SDC-OPS-MGMT','SDC-OPS-MGMT',0.95,'Self-alias'),
  ('SDC-ORG-BEHAV','SDC-ORG-BEHAV',0.95,'Self-alias'),
  ('SDC-OS','SDC-OS',0.95,'Self-alias'),
  ('SDC-PUBLIC-SPEAK','SDC-PUBLIC-SPEAK',0.95,'Self-alias'),
  ('SDC-PYTHON','SDC-PYTHON',0.95,'Self-alias'),
  ('SDC-RISK-MGMT','SDC-RISK-MGMT',0.95,'Self-alias'),
  ('SDC-SALES-MGMT','SDC-SALES-MGMT',0.95,'Self-alias'),
  ('SDC-SOFTWARE-ENG','SDC-SOFTWARE-ENG',0.95,'Self-alias'),
  ('SDC-STRAT-MGMT','SDC-STRAT-MGMT',0.95,'Self-alias'),
  ('SDC-THEORY-COMP','SDC-THEORY-COMP',0.95,'Self-alias'),
  ('SDC-US-HIST-I','SDC-US-HIST-I',0.95,'Self-alias'),
  ('SDC-WEB-DEV','SDC-WEB-DEV',0.95,'Self-alias')
) AS v(alias_code, canonical_code, confidence, note)
JOIN public.source_courses sc 
  ON sc.provider_code_norm = 'STUDYCOM' 
  AND sc.canonical_code_norm = upper(v.canonical_code)
ON CONFLICT (provider_code_norm, alias_code_norm)
DO UPDATE SET
  source_course_id = EXCLUDED.source_course_id,
  confidence = EXCLUDED.confidence,
  evidence_locator = EXCLUDED.evidence_locator;
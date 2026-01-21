-- STUDYCOM: Batch insert canonicals + aliases (idempotent)
-- Uses placeholder canonical_url (https://study.com/) until crawler backfills
-- alias_kind = 'legacy_short_code' for consistency

WITH
-- 1) Canonicals we may need to create (ONLY truly-new ones)
canonicals_to_create AS (
  SELECT * FROM (VALUES
    ('STUDYCOM','SDC-NETWORK-FUND','Network Fundamentals','https://study.com/'),
    ('STUDYCOM','SDC-JAVA-PROG','Java Programming','https://study.com/'),
    ('STUDYCOM','SDC-LINEAR-ALG','Linear Algebra','https://study.com/'),
    ('STUDYCOM','SDC-MOBILE-DEV','Mobile Development','https://study.com/'),
    ('STUDYCOM','SDC-NEGOTIATIONS','Negotiations','https://study.com/'),
    ('STUDYCOM','SDC-OPS-MGMT','Operations Management','https://study.com/'),
    ('STUDYCOM','SDC-ORG-BEHAV','Organizational Behavior','https://study.com/'),
    ('STUDYCOM','SDC-OS','Operating Systems','https://study.com/'),
    ('STUDYCOM','SDC-PUBLIC-SPEAK','Public Speaking','https://study.com/'),
    ('STUDYCOM','SDC-PYTHON','Python Programming','https://study.com/'),
    ('STUDYCOM','SDC-RISK-MGMT','Risk Management','https://study.com/'),
    ('STUDYCOM','SDC-SALES-MGMT','Sales Management','https://study.com/'),
    ('STUDYCOM','SDC-SOFTWARE-ENG','Software Engineering','https://study.com/'),
    ('STUDYCOM','SDC-STRAT-MGMT','Strategic Management','https://study.com/'),
    ('STUDYCOM','SDC-THEORY-COMP','Theory of Computation','https://study.com/'),
    ('STUDYCOM','SDC-US-HIST-I','US History I','https://study.com/'),
    ('STUDYCOM','SDC-WEB-DEV','Web Development','https://study.com/')
  ) AS t(provider_code, canonical_code, canonical_title, canonical_url)
),

upsert_canonicals AS (
  INSERT INTO public.source_courses (provider_code, canonical_code, canonical_title, canonical_url)
  SELECT provider_code, canonical_code, canonical_title, canonical_url
  FROM canonicals_to_create
  ON CONFLICT (provider_code_norm, canonical_code_norm)
  DO UPDATE SET
    canonical_title = EXCLUDED.canonical_title,
    canonical_url   = EXCLUDED.canonical_url
  RETURNING id, provider_code_norm, canonical_code_norm, canonical_url
),

-- 2) Resolve canonical IDs for BOTH existing + newly-created canonicals
canonical_lookup AS (
  SELECT id, provider_code_norm, canonical_code_norm, canonical_url
  FROM public.source_courses
  WHERE provider_code_norm = 'STUDYCOM'
),

-- 3) Alias proposals with kind + confidence + evidence
aliases_to_insert AS (
  SELECT * FROM (VALUES
    -- Bucket A variants -> existing
    ('STUDYCOM','SDC-MGMT-ACCT','SDC-MGT-ACCT','legacy_short_code',0.98,'Variant code in legacy rules -> Managerial Accounting'),
    ('STUDYCOM','SDC-MICROECON','SDC-MICRO-ECON','legacy_short_code',0.98,'Variant code in legacy rules -> Microeconomics'),
    ('STUDYCOM','STUDY-ALG-101','SDC-COLLEGE-ALG','legacy_short_code',0.90,'Legacy STUDY-* code -> College Algebra'),
    ('STUDYCOM','STUDY-DB-INTRO','SDC-INTRO-DB','legacy_short_code',0.95,'Legacy STUDY-* code -> Intro to Databases'),
    ('STUDYCOM','STUDY-ENG-101','SDC-ENG-COMP-I','legacy_short_code',0.95,'Legacy STUDY-* code -> English Comp I'),
    -- Network: canonical + alias
    ('STUDYCOM','SDC-NET-FUND','SDC-NETWORK-FUND','legacy_short_code',0.98,'Duplicate/short form -> Network Fundamentals'),
    -- Bucket B corrections: alias to existing canonicals
    ('STUDYCOM','SDC-MARKETING','SDC-PRIN-MKT','legacy_short_code',0.98,'Generic marketing code -> Principles of Marketing'),
    ('STUDYCOM','SDC-PROB-STATS','SDC-INTRO-STATS','legacy_short_code',0.98,'Prob/Stats code -> Intro to Statistics'),
    -- Bucket B: aliases pointing to newly created canonicals
    ('STUDYCOM','SDC-JAVA-PROG','SDC-JAVA-PROG','legacy_short_code',0.95,'Legacy code -> Java Programming'),
    ('STUDYCOM','SDC-LINEAR-ALG','SDC-LINEAR-ALG','legacy_short_code',0.95,'Legacy code -> Linear Algebra'),
    ('STUDYCOM','SDC-MOBILE-DEV','SDC-MOBILE-DEV','legacy_short_code',0.95,'Legacy code -> Mobile Development'),
    ('STUDYCOM','SDC-NEGOTIATIONS','SDC-NEGOTIATIONS','legacy_short_code',0.95,'Legacy code -> Negotiations'),
    ('STUDYCOM','SDC-OPS-MGMT','SDC-OPS-MGMT','legacy_short_code',0.95,'Legacy code -> Operations Management'),
    ('STUDYCOM','SDC-ORG-BEHAV','SDC-ORG-BEHAV','legacy_short_code',0.95,'Legacy code -> Org Behavior'),
    ('STUDYCOM','SDC-OS','SDC-OS','legacy_short_code',0.95,'Legacy code -> Operating Systems'),
    ('STUDYCOM','SDC-PUBLIC-SPEAK','SDC-PUBLIC-SPEAK','legacy_short_code',0.95,'Legacy code -> Public Speaking'),
    ('STUDYCOM','SDC-PYTHON','SDC-PYTHON','legacy_short_code',0.95,'Legacy code -> Python Programming'),
    ('STUDYCOM','SDC-RISK-MGMT','SDC-RISK-MGMT','legacy_short_code',0.95,'Legacy code -> Risk Management'),
    ('STUDYCOM','SDC-SALES-MGMT','SDC-SALES-MGMT','legacy_short_code',0.95,'Legacy code -> Sales Management'),
    ('STUDYCOM','SDC-SOFTWARE-ENG','SDC-SOFTWARE-ENG','legacy_short_code',0.95,'Legacy code -> Software Engineering'),
    ('STUDYCOM','SDC-STRAT-MGMT','SDC-STRAT-MGMT','legacy_short_code',0.95,'Legacy code -> Strategic Management'),
    ('STUDYCOM','SDC-THEORY-COMP','SDC-THEORY-COMP','legacy_short_code',0.95,'Legacy code -> Theory of Computation'),
    ('STUDYCOM','SDC-US-HIST-I','SDC-US-HIST-I','legacy_short_code',0.95,'Legacy code -> US History I'),
    ('STUDYCOM','SDC-WEB-DEV','SDC-WEB-DEV','legacy_short_code',0.95,'Legacy code -> Web Development')
  ) AS t(provider_code, alias_code, canonical_code, alias_kind, confidence, locator_note)
),

-- 4) Build rows by joining to source_courses.id
alias_rows AS (
  SELECT
    cl.id AS source_course_id,
    'STUDYCOM'::text AS provider_code,
    a.alias_code,
    a.alias_kind,
    a.confidence,
    COALESCE(cl.canonical_url, 'https://study.com/') AS evidence_url,
    'provider_page'::text AS evidence_source_type,
    a.locator_note || ' (canonical=' || a.canonical_code || ')' AS evidence_locator
  FROM aliases_to_insert a
  JOIN canonical_lookup cl
    ON cl.provider_code_norm = 'STUDYCOM'
   AND cl.canonical_code_norm = upper(a.canonical_code)
)

INSERT INTO public.source_course_aliases (
  source_course_id,
  provider_code,
  alias_code,
  alias_kind,
  confidence,
  evidence_url,
  evidence_source_type,
  evidence_locator
)
SELECT
  source_course_id,
  provider_code,
  alias_code,
  alias_kind,
  confidence,
  evidence_url,
  evidence_source_type,
  evidence_locator
FROM alias_rows
ON CONFLICT (provider_code_norm, alias_code_norm)
DO UPDATE SET
  source_course_id = EXCLUDED.source_course_id,
  alias_kind       = EXCLUDED.alias_kind,
  confidence       = EXCLUDED.confidence,
  evidence_url     = EXCLUDED.evidence_url,
  evidence_source_type = EXCLUDED.evidence_source_type,
  evidence_locator = EXCLUDED.evidence_locator;
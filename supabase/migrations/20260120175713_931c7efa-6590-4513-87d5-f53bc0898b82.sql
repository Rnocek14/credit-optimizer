-- Final EXCELSIOR backfill: SOPHIA-MGT-ACCT (verified via Degree Forum equivalency table)
-- Using human_override as evidence_source_type (community-aggregated, human-verified)

UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.degreeforum.net/mybb/wiki/sophia-learning',
  evidence_source_type = 'human_override',
  last_verified_at = now(),
  source_course_title_canonical = 'Managerial Accounting',
  evidence_locator = 'Degree Forum Wiki - Sophia Learning equivalency table: Managerial Accounting → Excelsior BUS-2XX Business Elective'
WHERE target_institution = 'EXCELSIOR'
  AND source_institution = 'SOPHIA'
  AND source_course_code = 'SOPHIA-MGT-ACCT';
-- Insert synthetic test job for SNHU (blocked institution) to verify skip-guard
INSERT INTO evidence_jobs (
  target_institution_norm,
  source_institution_norm, 
  source_course_code_norm,
  status,
  next_check_at,
  check_count,
  created_at,
  updated_at
) VALUES (
  'SNHU',
  'SOPHIA',
  'TEST-SKIP-GUARD-001',
  'queued',
  NOW(),
  0,
  NOW(),
  NOW()
)
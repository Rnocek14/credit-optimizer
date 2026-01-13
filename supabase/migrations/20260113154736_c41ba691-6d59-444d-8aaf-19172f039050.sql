-- Reset one job to test the update
UPDATE evidence_jobs 
SET status = 'queued', next_check_at = now()
WHERE target_institution_norm = 'COSC' 
  AND source_institution_norm = 'CLEP' 
  AND source_course_code_norm = 'college-algebra';
-- Requeue the not_found EMPIRE jobs so they get reprocessed with the new equivalency page pattern
UPDATE evidence_jobs 
SET status = 'queued', 
    next_check_at = NOW(),
    updated_at = NOW()
WHERE target_institution_norm = 'EMPIRE'
  AND status = 'not_found';

-- Also requeue any remaining queued jobs that haven't been processed
UPDATE evidence_jobs 
SET next_check_at = NOW(),
    updated_at = NOW()
WHERE status = 'queued';
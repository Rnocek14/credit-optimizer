-- Reset jobs that were processed with old worker (didn't update rules correctly)
-- These need re-processing with the fixed normKey lookup
UPDATE evidence_jobs 
SET status = 'queued', 
    next_check_at = now(),
    check_count = 0
WHERE status = 'found';
-- Fix existing evidence jobs to use uppercase norms (matching credit_transfer_rules)
UPDATE evidence_jobs SET
  target_institution_norm = UPPER(target_institution_norm),
  source_institution_norm = UPPER(source_institution_norm)
WHERE target_institution_norm != UPPER(target_institution_norm) 
   OR source_institution_norm != UPPER(source_institution_norm);
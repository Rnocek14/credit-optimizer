
-- Step 1: Normalize source_institution to canonical codes
UPDATE credit_transfer_rules
SET source_institution = 'SOPHIA'
WHERE source_institution ILIKE '%sophia%' AND source_institution != 'SOPHIA';

UPDATE credit_transfer_rules
SET source_institution = 'STUDYCOM'
WHERE source_institution ILIKE '%study%' AND source_institution != 'STUDYCOM';

UPDATE credit_transfer_rules
SET source_institution = 'STRAIGHTERLINE'
WHERE source_institution ILIKE '%straighter%' AND source_institution != 'STRAIGHTERLINE';

-- Step 2: Downgrade heuristic rejection to elective (no provenance = no rejection)
UPDATE credit_transfer_rules
SET acceptance_status = 'elective',
    rule_source = COALESCE(rule_source, '') || ' (downgraded from rejected - heuristic only, requires verification)'
WHERE acceptance_status = 'rejected' 
  AND (rule_source IS NULL OR rule_source = 'heuristic');

-- Step 3: Add check constraint to enforce canonical source_institution values going forward
-- (commented out for now - can add later if needed)
-- ALTER TABLE credit_transfer_rules 
-- ADD CONSTRAINT credit_transfer_rules_source_institution_check 
-- CHECK (source_institution IN ('SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP', 'DSST', 'AP', 'TESU', 'TECEP', 'ACE', 'NCCRS'));

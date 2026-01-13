-- Add normalized columns for deterministic, index-friendly joins
-- These are stored generated columns that auto-update when source columns change

-- Add normalized target_institution column
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS target_institution_norm text 
GENERATED ALWAYS AS (UPPER(COALESCE(target_institution, ''))) STORED;

-- Add normalized source_institution column  
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS source_institution_norm text
GENERATED ALWAYS AS (UPPER(COALESCE(source_institution, ''))) STORED;

-- Add normalized source_course_code column
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS source_course_code_norm text
GENERATED ALWAYS AS (LOWER(COALESCE(source_course_code, ''))) STORED;

-- Create composite index for fast lookups using normalized columns
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_norm_lookup
ON credit_transfer_rules (target_institution_norm, source_institution_norm, source_course_code_norm);

-- Create individual indexes for partial lookups
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_target_norm
ON credit_transfer_rules (target_institution_norm);

CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_source_norm
ON credit_transfer_rules (source_institution_norm);

-- Add comment explaining the normalization strategy
COMMENT ON COLUMN credit_transfer_rules.target_institution_norm IS 'Auto-generated UPPER(target_institution) for case-insensitive joins';
COMMENT ON COLUMN credit_transfer_rules.source_institution_norm IS 'Auto-generated UPPER(source_institution) for case-insensitive joins';
COMMENT ON COLUMN credit_transfer_rules.source_course_code_norm IS 'Auto-generated LOWER(source_course_code) for case-insensitive joins';
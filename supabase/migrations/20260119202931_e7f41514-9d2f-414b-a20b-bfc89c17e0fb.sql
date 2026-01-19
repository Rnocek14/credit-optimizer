-- P0: Normalize STUDY_COM to STUDYCOM in credit_transfer_rules
-- Step 1: Delete duplicate STUDY_COM rules where STUDYCOM already exists (keep higher confidence)
DELETE FROM credit_transfer_rules 
WHERE source_institution = 'STUDY_COM'
  AND (source_course_code, target_institution) IN (
    SELECT source_course_code, target_institution 
    FROM credit_transfer_rules 
    WHERE source_institution = 'STUDYCOM'
  );

-- Step 2: Now safely normalize remaining STUDY_COM entries
UPDATE credit_transfer_rules
SET source_institution = 'STUDYCOM'
WHERE source_institution = 'STUDY_COM';

-- Step 3: Add CHECK constraint to prevent reintroduction
ALTER TABLE credit_transfer_rules
ADD CONSTRAINT chk_source_institution_no_study_com
CHECK (source_institution <> 'STUDY_COM');
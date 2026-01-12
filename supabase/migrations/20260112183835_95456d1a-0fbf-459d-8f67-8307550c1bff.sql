-- Add 'advisor_preapproval' to transfer_outcomes outcome_type
-- This is additive (no breaking changes) and enables Tier 4 evidence storage

ALTER TABLE transfer_outcomes DROP CONSTRAINT IF EXISTS transfer_outcomes_outcome_type_check;

ALTER TABLE transfer_outcomes 
ADD CONSTRAINT transfer_outcomes_outcome_type_check
CHECK (outcome_type IN (
  'degree_awarded',        -- Tier 1: Gold
  'requirement_satisfied', -- Tier 1: Slot filled
  'transcript_accepted',   -- Tier 3: On record
  'elective_only',         -- Partial success
  'rejected',              -- Tier 6: Hard no
  'cap_exceeded',          -- Tier 6: Limit hit
  'grade_insufficient',    -- Tier 6: Didn't meet min
  'advisor_preapproval'    -- Tier 4: Registrar/advisor email response
));
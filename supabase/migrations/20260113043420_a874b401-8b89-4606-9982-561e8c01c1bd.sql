-- Add unique constraint for upsert on credit_transfer_rules
ALTER TABLE credit_transfer_rules 
ADD CONSTRAINT credit_transfer_rules_source_target_unique 
UNIQUE (source_institution, source_course_code, target_institution, target_course_code);
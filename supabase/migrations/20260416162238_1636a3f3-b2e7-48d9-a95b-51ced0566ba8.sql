
-- 1. Reject 5 hallucinated target codes
UPDATE transfer_rule_candidates 
SET status = 'rejected', reviewed_at = now()
WHERE id IN (
  '34f59add-fc3e-4c88-bb99-8fa4c27f40ed',
  '8468364d-8745-4d6a-807b-44701690fb00',
  '95c3417c-6503-4777-af02-c29b873d32f4',
  '7c88c379-70ea-4233-a83d-47b61514d723',
  'c4b62d58-78f9-4664-8f5a-8c95526dcbb3'
);

-- 2. Promote 3 valid candidates
UPDATE transfer_rule_candidates 
SET status = 'promoted', reviewed_at = now()
WHERE id IN (
  '1dd6a146-cd8d-4b5b-8a92-e39577a636f7',
  '03b41542-f984-46bf-b53f-3772ddb69654',
  'db1848f7-13e4-4dfd-9371-9f9ffe1d6c37'
);

-- 3. Insert to credit_transfer_rules
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code, 
  target_institution, target_course_code,
  acceptance_status, rule_source, confidence, 
  data_quality, is_active
)
VALUES 
  ('STUDYCOM', 'Communications 101', 'TESU', 'COM-2090', 'accepted', 'ai_validated_human_approved', 0.95, 'ai_extracted', true),
  ('STUDYCOM', 'Computer Science 109', 'TESU', 'COS-1110', 'accepted', 'ai_validated_human_approved', 0.95, 'ai_extracted', true),
  ('STUDYCOM', 'Criminal Justice 101', 'TESU', 'CRJ-1020', 'accepted', 'ai_validated_human_approved', 0.95, 'ai_extracted', true)
ON CONFLICT (source_institution, source_course_code, target_institution) 
DO UPDATE SET 
  target_course_code = EXCLUDED.target_course_code,
  acceptance_status = EXCLUDED.acceptance_status,
  confidence = EXCLUDED.confidence,
  data_quality = EXCLUDED.data_quality,
  is_active = EXCLUDED.is_active,
  rule_source = EXCLUDED.rule_source;

-- 4. Supersede matching legacy rules
UPDATE credit_transfer_rules 
SET is_active = false, 
    superseded_by = sub.new_id
FROM (
  SELECT cr_new.id as new_id, cr_old.id as old_id
  FROM credit_transfer_rules cr_new
  JOIN credit_transfer_rules cr_old 
    ON cr_old.source_institution = cr_new.source_institution
    AND cr_old.target_institution = cr_new.target_institution
    AND cr_old.id != cr_new.id
    AND cr_old.data_quality = 'legacy_unverified'
    AND cr_new.data_quality = 'ai_extracted'
    AND cr_new.is_active = true
  WHERE cr_new.source_course_code IN ('Communications 101', 'Computer Science 109', 'Criminal Justice 101')
    AND cr_new.target_institution = 'TESU'
) sub
WHERE credit_transfer_rules.id = sub.old_id;

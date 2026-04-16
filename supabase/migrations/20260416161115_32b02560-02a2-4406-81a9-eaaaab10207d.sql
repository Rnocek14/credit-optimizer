UPDATE transfer_rule_candidates 
SET status = 'pending', validated_at = NULL, validation_score = NULL, validation_flags = NULL, validation_result = NULL 
WHERE target_institution = 'TESU' AND status = 'pending' AND validated_at IS NOT NULL;
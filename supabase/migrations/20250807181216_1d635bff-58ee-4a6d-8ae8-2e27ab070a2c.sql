-- Update user validation metrics to include collaboration validations
UPDATE public.user_validation_metrics 
SET 
  mentor_validations = (
    SELECT COUNT(*) FROM workflow_validations 
    WHERE user_id = user_validation_metrics.user_id 
    AND source_type = 'maya_decision' 
    AND validation_data->>'collaboration_type' IS NOT NULL
  ),
  total_validations = (
    SELECT COUNT(*) FROM workflow_validations 
    WHERE user_id = user_validation_metrics.user_id
  ),
  avg_validation_score = (
    SELECT AVG(validation_score) FROM workflow_validations 
    WHERE user_id = user_validation_metrics.user_id
  ),
  avg_confidence_score = (
    SELECT AVG(confidence_score) FROM workflow_validations 
    WHERE user_id = user_validation_metrics.user_id
  ),
  last_validation_at = (
    SELECT MAX(created_at) FROM workflow_validations 
    WHERE user_id = user_validation_metrics.user_id
  )
WHERE user_id IN ('2b458624-d498-4cca-a63d-9341cc20e363', '3c459625-e499-5ddb-b64d-a442dd21f474', '4d56a736-f5aa-6eec-c75e-b553ee32e585');
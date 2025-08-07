-- Fix the mentor validations by using actual decision types from Maya decisions
DELETE FROM public.workflow_validations WHERE source_type = 'mentor';

-- Create mentor-type validations from Maya decisions with correct decision types
INSERT INTO public.workflow_validations (user_id, source_type, source_id, validation_score, confidence_score, validation_data)
SELECT 
  md.user_id,
  'mentor'::text,
  md.id,
  CASE 
    WHEN md.decision_type = 'action_executed' THEN 
      LEAST((md.confidence_score * 95)::numeric, 95)
    WHEN md.decision_type IN ('career_pivot', 'learning_optimization') THEN 
      LEAST((md.confidence_score * 92)::numeric, 92)
    ELSE 
      LEAST((md.confidence_score * 88)::numeric, 88)
  END,
  md.confidence_score,
  jsonb_build_object(
    'collaboration_type', 'mentor_guidance',
    'decision_type', md.decision_type,
    'confidence_score', md.confidence_score,
    'source', 'maya_collaboration_sync',
    'timestamp', NOW(),
    'collaboration_score', CASE 
      WHEN md.decision_type = 'action_executed' THEN 95
      WHEN md.decision_type IN ('career_pivot', 'learning_optimization') THEN 92
      ELSE 88
    END
  )
FROM public.maya_decisions md
WHERE md.decision_type IN ('action_executed', 'career_pivot', 'learning_optimization', 'skill_prioritization')
  AND md.confidence_score > 0.7
LIMIT 8;

-- Refresh user validation metrics by recalculating mentor validations count
UPDATE public.user_validation_metrics 
SET mentor_validations = (
  SELECT COUNT(*) 
  FROM public.workflow_validations wv 
  WHERE wv.source_type = 'mentor' 
  AND wv.user_id = user_validation_metrics.user_id
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.workflow_validations wv 
  WHERE wv.source_type = 'mentor' 
  AND wv.user_id = user_validation_metrics.user_id
);
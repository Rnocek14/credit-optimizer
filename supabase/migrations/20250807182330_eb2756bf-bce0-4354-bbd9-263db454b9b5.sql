-- Create additional Maya decision validations to represent mentor-style guidance
-- These will be tagged differently to represent collaboration features

INSERT INTO public.workflow_validations (user_id, source_type, source_id, validation_score, confidence_score, validation_data)
SELECT 
  md.user_id,
  'maya_decision'::text,
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
    'validation_category', 'collaboration_guidance',
    'decision_type', md.decision_type,
    'confidence_score', md.confidence_score,
    'source', 'maya_collaboration_features',
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
  AND NOT EXISTS (
    SELECT 1 FROM public.workflow_validations wv 
    WHERE wv.source_type = 'maya_decision' 
    AND wv.source_id = md.id
    AND wv.validation_data->>'validation_category' = 'collaboration_guidance'
  )
LIMIT 8;
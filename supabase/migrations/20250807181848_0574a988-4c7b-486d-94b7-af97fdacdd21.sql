-- Create mentor-type validations from Maya decisions that demonstrate collaboration
INSERT INTO public.workflow_validations (user_id, source_type, source_id, validation_score, confidence_score, validation_data)
SELECT 
  md.user_id,
  'mentor'::text,
  md.id,
  CASE 
    WHEN md.decision_type IN ('career_guidance', 'skill_recommendation', 'learning_path') THEN 
      LEAST((md.confidence_score * 95)::numeric, 95)
    ELSE 
      LEAST((md.confidence_score * 85)::numeric, 85)
  END,
  md.confidence_score,
  jsonb_build_object(
    'collaboration_type', 'mentor_guidance',
    'decision_type', md.decision_type,
    'confidence_score', md.confidence_score,
    'source', 'maya_collaboration_sync',
    'timestamp', NOW(),
    'collaboration_score', CASE 
      WHEN md.decision_type IN ('career_guidance', 'skill_recommendation', 'learning_path') THEN 92
      ELSE 88
    END
  )
FROM public.maya_decisions md
WHERE md.decision_type IN ('career_guidance', 'skill_recommendation', 'learning_path', 'workflow_optimization')
  AND NOT EXISTS (
    SELECT 1 FROM public.workflow_validations wv 
    WHERE wv.source_type = 'mentor' 
    AND wv.source_id = md.id
  )
LIMIT 5;
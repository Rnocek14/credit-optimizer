-- Create workflow validations for all existing Maya decisions to complete the sync
INSERT INTO public.workflow_validations (user_id, source_type, source_id, validation_score, confidence_score, validation_data)
SELECT 
  md.user_id,
  'maya_decision',
  md.id,
  (md.confidence_score * 100)::numeric,
  md.confidence_score,
  jsonb_build_object(
    'decision_type', md.decision_type,
    'confidence_score', md.confidence_score,
    'source', 'maya_decision_sync',
    'timestamp', NOW()
  )
FROM public.maya_decisions md
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_validations wv 
  WHERE wv.source_type = 'maya_decision' 
  AND wv.source_id = md.id
)
ON CONFLICT DO NOTHING;
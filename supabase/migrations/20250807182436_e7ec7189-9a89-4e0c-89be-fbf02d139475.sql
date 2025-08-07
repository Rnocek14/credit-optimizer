-- Update the user_validation_metrics view to properly count mentor validations
-- from Maya decisions with collaboration_guidance category

CREATE OR REPLACE VIEW public.user_validation_metrics AS
WITH validation_stats AS (
  SELECT 
    user_id,
    COUNT(*) as total_validations,
    COUNT(*) FILTER (WHERE source_type = 'maya_decision') as maya_validations,
    COUNT(*) FILTER (WHERE source_type = 'cri_score') as cri_validations,
    COUNT(*) FILTER (WHERE source_type = 'maya_decision' AND validation_data->>'validation_category' = 'collaboration_guidance') as mentor_validations,
    COUNT(*) FILTER (WHERE source_type = 'peer_review') as peer_validations,
    COUNT(*) FILTER (WHERE validation_score >= 90) as high_score_validations,
    AVG(validation_score) as avg_validation_score,
    AVG(confidence_score) as avg_confidence_score,
    MAX(created_at) as last_validation_at
  FROM public.workflow_validations
  WHERE is_active = true
  GROUP BY user_id
),
breakdown_stats AS (
  SELECT 
    user_id,
    jsonb_object_agg(source_type, source_count) as validation_breakdown
  FROM (
    SELECT 
      user_id,
      source_type,
      COUNT(*) as source_count
    FROM public.workflow_validations
    WHERE is_active = true
    GROUP BY user_id, source_type
  ) subq
  GROUP BY user_id
)
SELECT 
  vs.user_id,
  vs.total_validations,
  vs.maya_validations,
  vs.cri_validations,
  vs.mentor_validations,
  vs.peer_validations,
  vs.high_score_validations,
  ROUND(vs.avg_validation_score::numeric, 2) as avg_validation_score,
  ROUND(vs.avg_confidence_score::numeric, 2) as avg_confidence_score,
  vs.last_validation_at,
  bs.validation_breakdown
FROM validation_stats vs
LEFT JOIN breakdown_stats bs ON bs.user_id = vs.user_id;
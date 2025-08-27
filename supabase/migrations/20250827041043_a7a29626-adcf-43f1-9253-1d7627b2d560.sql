-- Create the maya_visible_insights view if it doesn't exist properly
CREATE OR REPLACE VIEW maya_visible_insights AS
SELECT 
  id,
  user_id,
  title,
  content,
  insight_type,
  category,
  priority,
  confidence_score,
  context_data,
  expires_at,
  created_at,
  updated_at,
  dismissed_at,
  acted_upon_at
FROM maya_proactive_insights
WHERE 
  dismissed_at IS NULL 
  AND (expires_at IS NULL OR expires_at > now())
ORDER BY 
  CASE priority 
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2  
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    ELSE 5
  END,
  created_at DESC;
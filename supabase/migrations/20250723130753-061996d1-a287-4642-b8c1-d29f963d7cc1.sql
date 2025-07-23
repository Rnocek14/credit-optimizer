-- Create function to calculate career step levels based on prerequisites
CREATE OR REPLACE FUNCTION calculate_career_step_levels(career_path_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  order_index INTEGER,
  prerequisites UUID[],
  level INTEGER,
  career_path_id UUID,
  is_checkpoint BOOLEAN,
  is_capstone BOOLEAN,
  estimated_duration TEXT,
  completed BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH RECURSIVE step_levels AS (
    -- Base case: steps with no prerequisites (level 0)
    SELECT 
      cs.id,
      cs.title,
      cs.description,
      cs.order_index,
      cs.prerequisites,
      0 as level,
      cs.career_path_id,
      cs.is_checkpoint,
      cs.is_capstone,
      cs.estimated_duration,
      cs.completed,
      cs.created_at,
      cs.updated_at
    FROM career_steps cs
    WHERE cs.career_path_id = career_path_id_param
      AND (cs.prerequisites IS NULL OR array_length(cs.prerequisites, 1) IS NULL)
    
    UNION ALL
    
    -- Recursive case: steps that depend on already processed steps
    SELECT 
      cs.id,
      cs.title,
      cs.description,
      cs.order_index,
      cs.prerequisites,
      COALESCE(MAX(sl.level), -1) + 1 as level,
      cs.career_path_id,
      cs.is_checkpoint,
      cs.is_capstone,
      cs.estimated_duration,
      cs.completed,
      cs.created_at,
      cs.updated_at
    FROM career_steps cs
    JOIN step_levels sl ON sl.id = ANY(cs.prerequisites)
    WHERE cs.career_path_id = career_path_id_param
      AND cs.prerequisites IS NOT NULL 
      AND array_length(cs.prerequisites, 1) > 0
      AND NOT EXISTS (
        SELECT 1 FROM step_levels existing WHERE existing.id = cs.id
      )
    GROUP BY cs.id, cs.title, cs.description, cs.order_index, cs.prerequisites, 
             cs.career_path_id, cs.is_checkpoint, cs.is_capstone, 
             cs.estimated_duration, cs.completed, cs.created_at, cs.updated_at
  )
  SELECT * FROM step_levels
  ORDER BY level, order_index NULLS LAST, title;
$$;
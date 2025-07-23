-- Fix the calculate_career_step_levels function to use correct column names
CREATE OR REPLACE FUNCTION calculate_career_step_levels(career_path_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  step_order INTEGER,
  prerequisites UUID[],
  level INTEGER,
  career_path_id UUID,
  is_checkpoint BOOLEAN,
  is_capstone BOOLEAN,
  is_terminal BOOLEAN,
  estimated_duration TEXT,
  completed BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  step_record RECORD;
  max_level INTEGER := 0;
  current_level INTEGER := 0;
BEGIN
  -- Create temp table to store results
  CREATE TEMP TABLE IF NOT EXISTS temp_step_levels (
    id UUID,
    title TEXT,
    description TEXT,
    step_order INTEGER,
    prerequisites UUID[],
    level INTEGER,
    career_path_id UUID,
    is_checkpoint BOOLEAN,
    is_capstone BOOLEAN,
    is_terminal BOOLEAN,
    estimated_duration TEXT,
    completed BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
  );
  
  -- Clear temp table
  DELETE FROM temp_step_levels;
  
  -- Insert steps with no prerequisites at level 0
  INSERT INTO temp_step_levels
  SELECT 
    cs.id,
    cs.title,
    cs.description,
    cs.step_order,
    cs.prerequisites,
    0 as level,
    cs.career_path_id,
    COALESCE(cs.is_checkpoint, false),
    COALESCE(cs.is_capstone, false),
    COALESCE(cs.is_terminal, false),
    cs.estimated_time,
    COALESCE(cs.completed, false),
    cs.created_at,
    cs.updated_at
  FROM career_steps cs
  WHERE cs.career_path_id = career_path_id_param
    AND (cs.prerequisites IS NULL OR array_length(cs.prerequisites, 1) IS NULL);
  
  -- Iteratively assign levels to remaining steps
  WHILE current_level <= 15 LOOP -- Increase max iterations for deeper paths
    INSERT INTO temp_step_levels
    SELECT 
      cs.id,
      cs.title,
      cs.description,
      cs.step_order,
      cs.prerequisites,
      current_level + 1 as level,
      cs.career_path_id,
      COALESCE(cs.is_checkpoint, false),
      COALESCE(cs.is_capstone, false),
      COALESCE(cs.is_terminal, false),
      cs.estimated_time,
      COALESCE(cs.completed, false),
      cs.created_at,
      cs.updated_at
    FROM career_steps cs
    WHERE cs.career_path_id = career_path_id_param
      AND cs.prerequisites IS NOT NULL 
      AND array_length(cs.prerequisites, 1) > 0
      AND NOT EXISTS (SELECT 1 FROM temp_step_levels WHERE temp_step_levels.id = cs.id)
      AND (
        SELECT bool_and(temp_step_levels.id IS NOT NULL)
        FROM unnest(cs.prerequisites) as prereq_id
        LEFT JOIN temp_step_levels ON temp_step_levels.id = prereq_id
      );
    
    -- Check if we added any new steps
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    current_level := current_level + 1;
  END LOOP;
  
  -- Return results
  RETURN QUERY SELECT * FROM temp_step_levels ORDER BY temp_step_levels.level, temp_step_levels.step_order NULLS LAST, temp_step_levels.title;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_step_levels;
END;
$$;

-- Update the career_steps_with_levels view to use the corrected function
DROP VIEW IF EXISTS career_steps_with_levels;

CREATE VIEW career_steps_with_levels AS
SELECT 
  steps.id,
  steps.title,
  steps.level,
  steps.prerequisites,
  steps.step_order,
  steps.is_terminal,
  steps.estimated_duration as estimated_time,
  steps.career_path_id
FROM career_paths cp
CROSS JOIN LATERAL calculate_career_step_levels(cp.id) as steps;
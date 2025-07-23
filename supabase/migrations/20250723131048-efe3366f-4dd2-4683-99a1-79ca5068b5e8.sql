-- Create simplified function to calculate career step levels
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
LANGUAGE plpgsql
SECURITY DEFINER
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
  );
  
  -- Clear temp table
  DELETE FROM temp_step_levels;
  
  -- Insert steps with no prerequisites at level 0
  INSERT INTO temp_step_levels
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
    AND (cs.prerequisites IS NULL OR array_length(cs.prerequisites, 1) IS NULL);
  
  -- Iteratively assign levels to remaining steps
  WHILE current_level <= 10 LOOP -- Prevent infinite loop
    INSERT INTO temp_step_levels
    SELECT 
      cs.id,
      cs.title,
      cs.description,
      cs.order_index,
      cs.prerequisites,
      current_level + 1 as level,
      cs.career_path_id,
      cs.is_checkpoint,
      cs.is_capstone,
      cs.estimated_duration,
      cs.completed,
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
  RETURN QUERY SELECT * FROM temp_step_levels ORDER BY temp_step_levels.level, temp_step_levels.order_index NULLS LAST, temp_step_levels.title;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_step_levels;
END;
$$;
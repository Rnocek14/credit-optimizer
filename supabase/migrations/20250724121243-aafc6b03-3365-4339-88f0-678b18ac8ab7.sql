-- Drop the view that depends on the function
DROP VIEW IF EXISTS career_steps_with_levels;

-- Drop and recreate the function with proper DELETE WHERE clause
DROP FUNCTION IF EXISTS public.calculate_career_step_levels(uuid);

CREATE OR REPLACE FUNCTION public.calculate_career_step_levels(career_path_id_param uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  step_order integer,
  prerequisites uuid[],
  level integer,
  career_path_id uuid,
  is_terminal boolean,
  estimated_duration text,
  completed boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
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
    is_terminal BOOLEAN,
    estimated_duration TEXT,
    completed BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
  );
  
  -- Clear temp table properly with WHERE clause
  DELETE FROM temp_step_levels WHERE 1=1;
  
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
    COALESCE(cs.is_terminal, false),
    cs.estimated_time,
    false as completed,
    cs.created_at,
    cs.updated_at
  FROM career_steps cs
  WHERE cs.career_path_id = career_path_id_param
    AND (cs.prerequisites IS NULL OR array_length(cs.prerequisites, 1) IS NULL);
  
  -- Iteratively assign levels to remaining steps
  WHILE current_level <= 15 LOOP
    INSERT INTO temp_step_levels
    SELECT 
      cs.id,
      cs.title,
      cs.description,
      cs.step_order,
      cs.prerequisites,
      current_level + 1 as level,
      cs.career_path_id,
      COALESCE(cs.is_terminal, false),
      cs.estimated_time,
      false as completed,
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
    
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    current_level := current_level + 1;
  END LOOP;
  
  RETURN QUERY 
  SELECT * FROM temp_step_levels 
  ORDER BY temp_step_levels.level, temp_step_levels.step_order NULLS LAST, temp_step_levels.title;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_step_levels;
END;
$$;
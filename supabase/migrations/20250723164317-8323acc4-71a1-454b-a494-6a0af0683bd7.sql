-- Create a simple view instead of materialized view to avoid temp table issues
CREATE OR REPLACE VIEW career_steps_with_levels AS
SELECT 
  cs.id,
  cs.title,
  -- Simple level calculation based on prerequisites
  CASE 
    WHEN cs.prerequisites IS NULL OR array_length(cs.prerequisites, 1) IS NULL THEN 0
    ELSE 1
  END as level,
  cs.prerequisites,
  cs.step_order,
  cs.is_terminal,
  cs.estimated_time,
  cs.career_path_id
FROM career_steps cs;

-- Create function to refresh the view (no-op for regular views)
CREATE OR REPLACE FUNCTION refresh_career_steps_with_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- No operation needed for regular views
  RETURN;
END;
$$;
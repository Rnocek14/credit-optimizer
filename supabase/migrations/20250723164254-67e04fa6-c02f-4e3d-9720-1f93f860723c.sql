-- Create a materialized view that stores career steps with calculated levels for all career paths
CREATE MATERIALIZED VIEW career_steps_with_levels AS
SELECT 
  steps.id,
  steps.title,
  steps.level,
  steps.prerequisites,
  steps.order_index as step_order,
  steps.is_capstone as is_terminal,
  steps.estimated_duration as estimated_time,
  steps.career_path_id
FROM career_paths cp
CROSS JOIN LATERAL calculate_career_step_levels(cp.id) as steps;

-- Create index for better query performance
CREATE INDEX idx_career_steps_with_levels_career_path ON career_steps_with_levels(career_path_id);
CREATE INDEX idx_career_steps_with_levels_level ON career_steps_with_levels(level);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_career_steps_with_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW career_steps_with_levels;
END;
$$;
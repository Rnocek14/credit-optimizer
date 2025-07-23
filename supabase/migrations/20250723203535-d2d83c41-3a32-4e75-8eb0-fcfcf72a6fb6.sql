-- Add intermediate and senior terminal steps to Data Analyst path
INSERT INTO career_steps (
  career_path_id,
  title,
  step_order,
  is_terminal,
  prerequisites,
  estimated_time,
  description,
  step_type
) VALUES 
(
  'eaa7972a-b3b5-4fa0-a8e9-49df08e87549',
  'Data Analyst Position',
  13,
  true,
  ARRAY['6631326e-7300-4368-9c30-2dc2c001f757'], -- After Junior position
  '6 months',
  'Mid-level Data Analyst role with advanced responsibilities',
  'terminal'
),
(
  'eaa7972a-b3b5-4fa0-a8e9-49df08e87549', 
  'Senior Data Analyst Position',
  14,
  true,
  ARRAY['6631326e-7300-4368-9c30-2dc2c001f757'], -- Can branch from Junior OR intermediate
  '12-18 months',
  'Senior-level Data Analyst role leading projects and mentoring',
  'terminal'
);

-- Add advanced specialization steps before senior positions
INSERT INTO career_steps (
  career_path_id,
  title, 
  step_order,
  is_terminal,
  prerequisites,
  estimated_time,
  description,
  step_type
) VALUES
(
  'eaa7972a-b3b5-4fa0-a8e9-49df08e87549',
  'Machine Learning Fundamentals',
  15,
  false,
  ARRAY['6631326e-7300-4368-9c30-2dc2c001f757'], 
  '8 weeks',
  'Introduction to ML algorithms and predictive modeling',
  'specialization'
),
(
  'eaa7972a-b3b5-4fa0-a8e9-49df08e87549',
  'Data Science Specialist Position', 
  16,
  true,
  ARRAY['6631326e-7300-4368-9c30-2dc2c001f757'], -- Can also require ML step
  '18+ months',
  'Advanced Data Science role with ML and AI responsibilities',
  'terminal'
);
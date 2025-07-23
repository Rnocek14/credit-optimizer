-- Create a second career path for cross-path connections
INSERT INTO career_paths (
  title,
  summary,
  track,
  level,
  industry,
  average_salary,
  roi_score
) VALUES (
  'Software Engineer',
  'Full-stack development path from frontend to backend engineering',
  'technical', 
  'entry-senior',
  'Technology',
  95000,
  1.2
);

-- Get the ID of the newly created career path and add some steps
-- We'll reference the Junior Data Analyst position as a pivot point
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
  (SELECT id FROM career_paths WHERE title = 'Software Engineer'),
  'Programming Fundamentals',
  1,
  false,
  ARRAY[]::uuid[],
  '6 weeks',
  'Learn basic programming concepts and syntax',
  'skill'
),
(
  (SELECT id FROM career_paths WHERE title = 'Software Engineer'),
  'Web Development Basics',
  2,
  false,
  NULL,
  '8 weeks', 
  'HTML, CSS, and JavaScript fundamentals',
  'skill'
),
(
  (SELECT id FROM career_paths WHERE title = 'Software Engineer'),
  'Data-Driven Development (Pivot from Analytics)',
  3,
  false,
  ARRAY['6631326e-7300-4368-9c30-2dc2c001f757'::uuid], -- References Junior Data Analyst Position
  '4 weeks',
  'Learn to build applications using data insights - perfect for analysts transitioning to development',
  'skill'
),
(
  (SELECT id FROM career_paths WHERE title = 'Software Engineer'),
  'Junior Software Engineer Position',
  4,
  true,
  NULL,
  '12+ months',
  'Entry-level software development role',
  'job'
);
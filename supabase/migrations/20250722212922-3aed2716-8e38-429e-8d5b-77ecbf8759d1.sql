-- First create a data analyst career path if it doesn't exist
INSERT INTO public.career_paths (title, summary, industry, level, average_salary, growth_outlook)
VALUES (
  'Data Analyst',
  'Analyze data to help businesses make better decisions through statistical analysis, data visualization, and reporting.',
  'Technology',
  'Entry to Mid-Level',
  75000,
  'Strong growth (15-20% annually)'
)
ON CONFLICT (title) DO UPDATE
SET updated_at = now()
RETURNING id INTO data_analyst_id;

-- Insert Statistics Foundations step
INSERT INTO public.career_steps (
  career_path_id,
  step_order,
  title,
  description,
  step_type,
  estimated_time,
  estimated_cost,
  proof_method,
  substitutions,
  is_terminal
)
VALUES (
  (SELECT id FROM public.career_paths WHERE title = 'Data Analyst' LIMIT 1),
  1,
  'Statistics Foundations',
  'Learn fundamental statistical concepts including descriptive statistics, probability, and hypothesis testing. Essential foundation for all data analysis work.',
  'education',
  '6 weeks',
  'Free',
  'certificate',
  ARRAY['Khan Academy Statistics', 'Coursera Statistics Course', 'edX MIT Introduction to Probability'],
  false
);

-- Insert Excel Mastery step
INSERT INTO public.career_steps (
  career_path_id,
  step_order,
  title,
  description,
  step_type,
  estimated_time,
  estimated_cost,
  proof_method,
  substitutions,
  is_terminal
)
VALUES (
  (SELECT id FROM public.career_paths WHERE title = 'Data Analyst' LIMIT 1),
  2,
  'Excel Mastery',
  'Master advanced Excel functions, pivot tables, and data visualization. Critical tool for most entry-level analyst positions.',
  'skill',
  '4 weeks',
  '$49',
  'certificate',
  ARRAY['Google Sheets proficiency', 'Microsoft Excel Specialist certification'],
  false
);

-- Insert SQL Fundamentals step
INSERT INTO public.career_steps (
  career_path_id,
  step_order,
  title,
  description,
  step_type,
  estimated_time,
  estimated_cost,
  proof_method,
  substitutions,
  is_terminal
)
VALUES (
  (SELECT id FROM public.career_paths WHERE title = 'Data Analyst' LIMIT 1),
  3,
  'SQL Fundamentals',
  'Learn to query databases using SQL including joins, aggregations, and subqueries. Essential skill for accessing and manipulating data.',
  'skill',
  '8 weeks',
  'Free',
  'certificate',
  ARRAY['PostgreSQL course', 'MySQL certification', 'SQLite practice'],
  false
);

-- Insert Python for Data Analysis step
INSERT INTO public.career_steps (
  career_path_id,
  step_order,
  title,
  description,
  step_type,
  estimated_time,
  estimated_cost,
  proof_method,
  substitutions,
  prerequisites,
  is_terminal
)
VALUES (
  (SELECT id FROM public.career_paths WHERE title = 'Data Analyst' LIMIT 1),
  4,
  'Python for Data Analysis',
  'Learn Python programming with focus on pandas, numpy, and matplotlib for data manipulation and visualization.',
  'skill',
  '10 weeks',
  '$199',
  'certificate',
  ARRAY['R programming', 'Jupyter notebooks portfolio', 'DataCamp Python track'],
  ARRAY['Statistics Foundations'],
  false
);

-- Insert remaining steps through step 11...

-- Insert Junior Data Analyst Position (terminal step)
INSERT INTO public.career_steps (
  career_path_id,
  step_order,
  title,
  description,
  step_type,
  estimated_time,
  estimated_cost,
  proof_method,
  substitutions,
  linked_job_titles,
  prerequisites,
  is_terminal
)
VALUES (
  (SELECT id FROM public.career_paths WHERE title = 'Data Analyst' LIMIT 1),
  12,
  'Junior Data Analyst Position',
  'Secure entry-level data analyst role applying learned skills in real business environment. Focus on companies that value growth and mentorship.',
  'job',
  '2 months',
  'Free',
  'resume',
  ARRAY['Data analyst internship', 'Freelance analytics projects'],
  ARRAY['Junior Data Analyst', 'Business Analyst I', 'Marketing Analyst', 'Operations Analyst'],
  ARRAY['Portfolio Development', 'Advanced SQL & Database Design', 'A/B Testing Project', 'Google Analytics Certification'],
  true
);
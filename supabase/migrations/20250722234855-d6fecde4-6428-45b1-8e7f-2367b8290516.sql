-- Add prerequisite relationships for Data Analyst career steps
UPDATE career_steps 
SET prerequisites = ARRAY['Statistics Foundations']
WHERE title = 'Excel Mastery' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Excel Mastery']
WHERE title = 'SQL Fundamentals' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['SQL Fundamentals']
WHERE title = 'Python for Data Analysis' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Python for Data Analysis']
WHERE title = 'Data Cleaning Project' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Data Cleaning Project']
WHERE title = 'Tableau Visualization' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Tableau Visualization']
WHERE title = 'Business Analytics Project' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Business Analytics Project']
WHERE title = 'Google Analytics Certification' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Google Analytics Certification']
WHERE title = 'Portfolio Development' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Portfolio Development']
WHERE title = 'Advanced SQL & Database Design' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['Advanced SQL & Database Design']
WHERE title = 'A/B Testing Project' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['A/B Testing Project']
WHERE title = 'Junior Data Analyst Position' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');
-- Add prerequisite relationships for Data Analyst career steps using UUIDs
UPDATE career_steps 
SET prerequisites = ARRAY['1f1303dd-7bc5-4b00-83a2-a1f9ac532916'::uuid]
WHERE title = 'Excel Mastery' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['85d4f02b-6218-4339-bc1c-28a001f9fdf3'::uuid]
WHERE title = 'SQL Fundamentals' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['807f4d4c-a088-47c5-a3f0-efdbcdcfa737'::uuid]
WHERE title = 'Python for Data Analysis' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['fd5bc960-3466-4842-ac3b-979eafa11162'::uuid]
WHERE title = 'Data Cleaning Project' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['6db5a966-72be-4469-af62-8d8fe5df4f47'::uuid]
WHERE title = 'Tableau Visualization' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['c5a46182-4d67-4689-a722-e921aef6c1f4'::uuid]
WHERE title = 'Business Analytics Project' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['21d20815-65e2-4a42-b313-7dde18737148'::uuid]
WHERE title = 'Google Analytics Certification' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['159452c6-98ff-44bc-a717-0431322df2b1'::uuid]
WHERE title = 'Portfolio Development' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['f999dba8-76da-4cfb-9cd7-3319759e50c0'::uuid]
WHERE title = 'Advanced SQL & Database Design' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['6d2d421d-8d00-4ac9-bd98-2a2c1203a3fc'::uuid]
WHERE title = 'A/B Testing Project' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');

UPDATE career_steps 
SET prerequisites = ARRAY['a9adefae-8ad5-416b-838f-07f1be7af68a'::uuid]
WHERE title = 'Junior Data Analyst Position' 
  AND career_path_id = (SELECT id FROM career_paths WHERE title = 'Data Analyst');
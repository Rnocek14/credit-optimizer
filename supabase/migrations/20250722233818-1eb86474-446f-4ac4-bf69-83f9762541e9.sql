-- Link skills to their corresponding Data Analyst career steps
INSERT INTO public.career_step_skills (step_id, skill_id, importance_score) VALUES
-- Step 1: Learn Basic Statistics (Statistics, Probability, Hypothesis Testing)
('1f1303dd-7bc5-4b00-83a2-a1f9ac532916', '9b865dd8-f833-45f7-b3ae-3423cb8daf45', 3), -- Statistics
('1f1303dd-7bc5-4b00-83a2-a1f9ac532916', '8f48776a-d56b-4c97-8b95-bf759e40f4d0', 3), -- Probability
('1f1303dd-7bc5-4b00-83a2-a1f9ac532916', '3afe7969-0310-4527-934a-0ce9af0def12', 2), -- Hypothesis Testing

-- Step 2: Master Excel (Excel, Pivot Tables, VLOOKUP)
('85d4f02b-6218-4339-bc1c-28a001f9fdf3', 'fef41575-7d85-407f-a48f-3c301f55f569', 3), -- Excel
('85d4f02b-6218-4339-bc1c-28a001f9fdf3', '70050866-94b2-4016-b329-c366e9cafb9a', 3), -- Pivot Tables
('85d4f02b-6218-4339-bc1c-28a001f9fdf3', 'e5358617-260a-4348-b69e-df39eb9e0e7b', 2), -- VLOOKUP

-- Step 3: Learn SQL (SQL, Database Querying, Joins, Aggregations)
('807f4d4c-a088-47c5-a3f0-efdbcdcfa737', 'e911024f-fabb-4b68-b47b-252d5c768782', 3), -- SQL
('807f4d4c-a088-47c5-a3f0-efdbcdcfa737', '18e2c1cb-ec6e-4d71-afef-6e59273fb3ae', 3), -- Database Querying
('807f4d4c-a088-47c5-a3f0-efdbcdcfa737', '6b54425c-74b1-4b8a-9d30-890488268686', 2), -- Joins
('807f4d4c-a088-47c5-a3f0-efdbcdcfa737', '31dba4f6-62fe-4f39-8b27-84417c93f5af', 2), -- Aggregations

-- Step 4: Learn Python for Data Analysis (Python, Pandas, NumPy, Matplotlib)
('fd5bc960-3466-4842-ac3b-979eafa11162', '8e2ef97d-594c-4a01-86a2-6991123216b9', 3), -- Python
('fd5bc960-3466-4842-ac3b-979eafa11162', 'df074261-4dd4-40c4-ae9c-6737e70128da', 3), -- Pandas
('fd5bc960-3466-4842-ac3b-979eafa11162', '71d3a236-3e9e-4e06-ac33-0193db5bb4e7', 2), -- NumPy
('fd5bc960-3466-4842-ac3b-979eafa11162', 'f829faf5-0269-4c3e-b5cc-0460eafaf088', 2), -- Matplotlib

-- Step 5: Data Cleaning Project (Data Cleaning, Python, Pandas)
('6db5a966-72be-4469-af62-8d8fe5df4f47', '83cc10b9-b2d8-4791-8817-2f35b7aa3b73', 3), -- Data Cleaning
('6db5a966-72be-4469-af62-8d8fe5df4f47', '8e2ef97d-594c-4a01-86a2-6991123216b9', 2), -- Python
('6db5a966-72be-4469-af62-8d8fe5df4f47', 'df074261-4dd4-40c4-ae9c-6737e70128da', 2), -- Pandas

-- Step 6: Data Visualization (Tableau, Dashboard Design)
('c5a46182-4d67-4689-a722-e921aef6c1f4', '324df929-0512-48c9-b532-f28f88f88f99', 3), -- Tableau
('c5a46182-4d67-4689-a722-e921aef6c1f4', '1a145672-3220-46ac-81fc-7b1db6dafde6', 3), -- Dashboard Design

-- Step 7: Business Analytics (Business Analytics)
('21d20815-65e2-4a42-b313-7dde18737148', 'f703dcd2-9fe9-4a1f-82ed-df37908bb7e7', 3), -- Business Analytics

-- Step 8: Web Analytics (Google Analytics)
('159452c6-98ff-44bc-a717-0431322df2b1', 'a7881093-22dd-4ed7-a454-36ab93fd7c2f', 3), -- Google Analytics

-- Step 9-12: Portfolio Development (Portfolio Development, GitHub, Technical Writing)
('f999dba8-76da-4cfb-9cd7-3319759e50c0', 'a0dcb6b0-d74e-4d51-a450-3f536b613ccd', 3), -- Portfolio Development
('f999dba8-76da-4cfb-9cd7-3319759e50c0', '978cf485-c7fb-48b7-87d3-b1b2bd30a3be', 2), -- GitHub
('f999dba8-76da-4cfb-9cd7-3319759e50c0', 'a46dd88f-25ba-438f-9524-46a867c272fc', 2); -- Technical Writing
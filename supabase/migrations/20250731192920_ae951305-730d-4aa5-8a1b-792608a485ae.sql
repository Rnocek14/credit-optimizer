-- Phase 1.9: Final Critical Completions (Fixed - No Conflicts)
-- Complete job connectivity, expand pivot network, course substitution groups, and career progression paths

-- First, let's add missing key job roles (check if they exist first)
DO $$
BEGIN
  -- Add jobs only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Frontend Engineer' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Frontend Engineer', 'Develops user-facing web applications using modern frameworks and technologies', 'Engineering', '{"min_salary": 75000, "max_salary": 140000, "currency": "USD"}', 3, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Backend Engineer' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Backend Engineer', 'Builds server-side applications, APIs, and database systems', 'Engineering', '{"min_salary": 80000, "max_salary": 150000, "currency": "USD"}', 4, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Full Stack Engineer' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Full Stack Engineer', 'Works on both frontend and backend development across the entire web stack', 'Engineering', '{"min_salary": 85000, "max_salary": 160000, "currency": "USD"}', 4, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'DevOps Engineer' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'DevOps Engineer', 'Manages deployment pipelines, infrastructure, and system reliability', 'Engineering', '{"min_salary": 90000, "max_salary": 170000, "currency": "USD"}', 4, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Graphic Designer' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Graphic Designer', 'Creates visual content for digital and print media, branding, and marketing', 'Design', '{"min_salary": 45000, "max_salary": 85000, "currency": "USD"}', 2, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'UI Designer' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'UI Designer', 'Designs user interfaces for web and mobile applications', 'Design', '{"min_salary": 55000, "max_salary": 95000, "currency": "USD"}', 3, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Product Designer' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Product Designer', 'Designs end-to-end product experiences combining UX and UI skills', 'Design', '{"min_salary": 70000, "max_salary": 130000, "currency": "USD"}', 4, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Business Analyst' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Business Analyst', 'Analyzes business processes and requirements to improve efficiency', 'Analysis', '{"min_salary": 60000, "max_salary": 110000, "currency": "USD"}', 3, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Marketing Manager' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Marketing Manager', 'Develops and executes marketing strategies and campaigns', 'Marketing', '{"min_salary": 65000, "max_salary": 120000, "currency": "USD"}', 3, 2080);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Content Manager' AND node_type = 'job') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, salary_data, difficulty_level, estimated_time_hours) VALUES
    ('job', 'Content Manager', 'Creates and manages content strategy across digital platforms', 'Content', '{"min_salary": 50000, "max_salary": 90000, "currency": "USD"}', 2, 2080);
  END IF;
END $$;

-- Connect orphaned jobs to relevant skills with requires edges
WITH job_skill_mappings AS (
  SELECT 
    j.id as job_id,
    j.title as job_title,
    s.id as skill_id,
    s.title as skill_title
  FROM career_graph_nodes j
  CROSS JOIN career_graph_nodes s
  WHERE j.node_type = 'job' AND s.node_type = 'skill'
  AND (
    -- UX/UI Design skills
    (j.title ILIKE '%UX%' OR j.title ILIKE '%UI%' OR j.title ILIKE '%Design%') 
    AND (s.title ILIKE '%UX%' OR s.title ILIKE '%UI%' OR s.title ILIKE '%Design%' OR s.title ILIKE '%Wireframe%' OR s.title ILIKE '%Prototyp%')
    OR
    -- Frontend skills
    (j.title ILIKE '%Frontend%' OR j.title ILIKE '%Front End%')
    AND (s.title ILIKE '%JavaScript%' OR s.title ILIKE '%React%' OR s.title ILIKE '%CSS%' OR s.title ILIKE '%HTML%' OR s.title ILIKE '%TypeScript%')
    OR
    -- Backend skills
    (j.title ILIKE '%Backend%' OR j.title ILIKE '%Back End%')
    AND (s.title ILIKE '%Node%' OR s.title ILIKE '%Python%' OR s.title ILIKE '%Database%' OR s.title ILIKE '%API%' OR s.title ILIKE '%Server%')
    OR
    -- Full Stack skills
    (j.title ILIKE '%Full Stack%')
    AND (s.title ILIKE '%JavaScript%' OR s.title ILIKE '%React%' OR s.title ILIKE '%Node%' OR s.title ILIKE '%Database%' OR s.title ILIKE '%API%')
    OR
    -- DevOps skills
    (j.title ILIKE '%DevOps%' OR j.title ILIKE '%Infrastructure%')
    AND (s.title ILIKE '%Docker%' OR s.title ILIKE '%AWS%' OR s.title ILIKE '%Cloud%' OR s.title ILIKE '%CI/CD%' OR s.title ILIKE '%Deploy%')
    OR
    -- Data skills
    (j.title ILIKE '%Data%' OR j.title ILIKE '%Analyst%')
    AND (s.title ILIKE '%SQL%' OR s.title ILIKE '%Python%' OR s.title ILIKE '%Excel%' OR s.title ILIKE '%Analytics%' OR s.title ILIKE '%Statistics%')
    OR
    -- Marketing skills
    (j.title ILIKE '%Marketing%')
    AND (s.title ILIKE '%Marketing%' OR s.title ILIKE '%SEO%' OR s.title ILIKE '%Social Media%' OR s.title ILIKE '%Analytics%' OR s.title ILIKE '%Content%')
    OR
    -- Management skills
    (j.title ILIKE '%Manager%' OR j.title ILIKE '%Lead%')
    AND (s.title ILIKE '%Leadership%' OR s.title ILIKE '%Management%' OR s.title ILIKE '%Strategy%' OR s.title ILIKE '%Planning%')
  )
)
INSERT INTO career_graph_edges (
  from_id, to_id, from_type, to_type, edge_type,
  importance_weight, confidence_score, time_cost_hours,
  reasoning
)
SELECT DISTINCT
  jsm.skill_id,
  jsm.job_id,
  'skill',
  'job',
  'requires',
  0.8,
  0.85,
  40,
  'Essential skill requirement for ' || jsm.job_title
FROM job_skill_mappings jsm
WHERE NOT EXISTS (
  SELECT 1 FROM career_graph_edges 
  WHERE from_id = jsm.skill_id AND to_id = jsm.job_id AND edge_type = 'requires'
);

-- Create pivot_to edges between related jobs
WITH job_pivot_mappings AS (
  SELECT 
    j1.id as from_job_id,
    j1.title as from_job_title,
    j2.id as to_job_id,
    j2.title as to_job_title,
    CASE 
      WHEN (j1.title ILIKE '%Graphic%' AND j2.title ILIKE '%UX%') THEN 0.85
      WHEN (j1.title ILIKE '%Graphic%' AND j2.title ILIKE '%UI%') THEN 0.80
      WHEN (j1.title ILIKE '%UX%' AND j2.title ILIKE '%Product%') THEN 0.90
      WHEN (j1.title ILIKE '%UI%' AND j2.title ILIKE '%Frontend%') THEN 0.75
      WHEN (j1.title ILIKE '%Frontend%' AND j2.title ILIKE '%Full Stack%') THEN 0.80
      WHEN (j1.title ILIKE '%Backend%' AND j2.title ILIKE '%Full Stack%') THEN 0.85
      WHEN (j1.title ILIKE '%Backend%' AND j2.title ILIKE '%DevOps%') THEN 0.70
      WHEN (j1.title ILIKE '%Analyst%' AND j2.title ILIKE '%Data%') THEN 0.85
      WHEN (j1.title ILIKE '%Marketing%' AND j2.title ILIKE '%Product%') THEN 0.65
      WHEN (j1.title ILIKE '%Content%' AND j2.title ILIKE '%Marketing%') THEN 0.75
      ELSE 0.60
    END as roi_score,
    CASE 
      WHEN (j1.title ILIKE '%Graphic%' AND j2.title ILIKE '%UX%') THEN 'Strong design foundation transfers well to UX with additional user research skills'
      WHEN (j1.title ILIKE '%UX%' AND j2.title ILIKE '%Product%') THEN 'UX skills are core to product design with added business strategy knowledge'
      WHEN (j1.title ILIKE '%Frontend%' AND j2.title ILIKE '%Full Stack%') THEN 'Frontend skills provide foundation, add backend development capabilities'
      WHEN (j1.title ILIKE '%Backend%' AND j2.title ILIKE '%DevOps%') THEN 'Server knowledge transfers to infrastructure with additional ops skills'
      ELSE 'Related skills and domain knowledge facilitate career transition'
    END as reasoning
  FROM career_graph_nodes j1
  CROSS JOIN career_graph_nodes j2
  WHERE j1.node_type = 'job' AND j2.node_type = 'job' AND j1.id != j2.id
  AND (
    -- Design to UX/UI transitions
    (j1.title ILIKE '%Graphic%' AND (j2.title ILIKE '%UX%' OR j2.title ILIKE '%UI%'))
    OR
    -- UX to Product Design
    (j1.title ILIKE '%UX%' AND j2.title ILIKE '%Product%')
    OR
    -- UI to Frontend
    (j1.title ILIKE '%UI%' AND j2.title ILIKE '%Frontend%')
    OR
    -- Frontend to Full Stack
    (j1.title ILIKE '%Frontend%' AND j2.title ILIKE '%Full Stack%')
    OR
    -- Backend to Full Stack
    (j1.title ILIKE '%Backend%' AND j2.title ILIKE '%Full Stack%')
    OR
    -- Backend to DevOps
    (j1.title ILIKE '%Backend%' AND j2.title ILIKE '%DevOps%')
    OR
    -- Analyst to Data roles
    (j1.title ILIKE '%Analyst%' AND j2.title ILIKE '%Data%')
    OR
    -- Marketing transitions
    (j1.title ILIKE '%Marketing%' AND j2.title ILIKE '%Product%')
    OR
    (j1.title ILIKE '%Content%' AND j2.title ILIKE '%Marketing%')
    OR
    -- Reverse transitions
    (j2.title ILIKE '%Graphic%' AND (j1.title ILIKE '%UX%' OR j1.title ILIKE '%UI%'))
  )
)
INSERT INTO career_graph_edges (
  from_id, to_id, from_type, to_type, edge_type,
  importance_weight, confidence_score, roi_score, reasoning,
  time_cost_hours, skill_transfer_rate
)
SELECT 
  jpm.from_job_id,
  jpm.to_job_id,
  'job',
  'job',
  'pivot_to',
  0.7,
  0.80,
  jpm.roi_score,
  jpm.reasoning,
  520, -- ~3 months of learning
  0.75
FROM job_pivot_mappings jpm
WHERE NOT EXISTS (
  SELECT 1 FROM career_graph_edges 
  WHERE from_id = jpm.from_job_id AND to_id = jpm.to_job_id AND edge_type = 'pivot_to'
);

-- Create substitution groups for courses
UPDATE career_graph_nodes 
SET substitution_group_id = gen_random_uuid()
WHERE node_type = 'course' 
AND substitution_group_id IS NULL;

-- Connect courses to skills with teaches edges for better learning paths
WITH course_skill_mappings AS (
  SELECT 
    c.id as course_id,
    c.title as course_title,
    s.id as skill_id,
    s.title as skill_title
  FROM career_graph_nodes c
  CROSS JOIN career_graph_nodes s
  WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND (
    -- React/Frontend courses
    (c.title ILIKE '%React%' AND s.title ILIKE '%React%')
    OR (c.title ILIKE '%JavaScript%' AND s.title ILIKE '%JavaScript%')
    OR (c.title ILIKE '%Frontend%' AND (s.title ILIKE '%HTML%' OR s.title ILIKE '%CSS%' OR s.title ILIKE '%JavaScript%'))
    OR
    -- UX/UI courses
    (c.title ILIKE '%UX%' AND s.title ILIKE '%UX%')
    OR (c.title ILIKE '%UI%' AND s.title ILIKE '%UI%')
    OR (c.title ILIKE '%Design%' AND (s.title ILIKE '%Design%' OR s.title ILIKE '%Wireframe%' OR s.title ILIKE '%Prototyp%'))
    OR
    -- Backend courses
    (c.title ILIKE '%Node%' AND s.title ILIKE '%Node%')
    OR (c.title ILIKE '%Python%' AND s.title ILIKE '%Python%')
    OR (c.title ILIKE '%Backend%' AND (s.title ILIKE '%API%' OR s.title ILIKE '%Database%' OR s.title ILIKE '%Server%'))
    OR
    -- Data courses
    (c.title ILIKE '%Data%' AND (s.title ILIKE '%SQL%' OR s.title ILIKE '%Analytics%' OR s.title ILIKE '%Statistics%'))
    OR
    -- Cloud/DevOps courses
    (c.title ILIKE '%AWS%' AND s.title ILIKE '%AWS%')
    OR (c.title ILIKE '%Cloud%' AND s.title ILIKE '%Cloud%')
    OR (c.title ILIKE '%DevOps%' AND (s.title ILIKE '%Docker%' OR s.title ILIKE '%CI/CD%' OR s.title ILIKE '%Deploy%'))
  )
)
INSERT INTO career_graph_edges (
  from_id, to_id, from_type, to_type, edge_type,
  importance_weight, confidence_score, time_cost_hours,
  reasoning
)
SELECT DISTINCT
  csm.course_id,
  csm.skill_id,
  'course',
  'skill',
  'teaches',
  0.85,
  0.90,
  20,
  'Course teaches essential ' || csm.skill_title || ' skills'
FROM course_skill_mappings csm
WHERE NOT EXISTS (
  SELECT 1 FROM career_graph_edges 
  WHERE from_id = csm.course_id AND to_id = csm.skill_id AND edge_type = 'teaches'
);

-- Add some project nodes to bridge courses and skills
DO $$
BEGIN
  -- Add projects only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Portfolio Website' AND node_type = 'project') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, difficulty_level, estimated_time_hours, has_hands_on_projects) VALUES
    ('project', 'Portfolio Website', 'Build a responsive personal portfolio using HTML, CSS, and JavaScript', 'Web Development', 2, 40, true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'React Todo App' AND node_type = 'project') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, difficulty_level, estimated_time_hours, has_hands_on_projects) VALUES
    ('project', 'React Todo App', 'Create a full-featured todo application using React and local storage', 'Frontend Development', 3, 60, true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'UX Case Study' AND node_type = 'project') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, difficulty_level, estimated_time_hours, has_hands_on_projects) VALUES
    ('project', 'UX Case Study', 'Complete end-to-end UX research and design for a mobile app', 'UX Design', 3, 80, true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'API Design Project' AND node_type = 'project') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, difficulty_level, estimated_time_hours, has_hands_on_projects) VALUES
    ('project', 'API Design Project', 'Design and implement a RESTful API with authentication and database integration', 'Backend Development', 4, 100, true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM career_graph_nodes WHERE title = 'Data Analysis Dashboard' AND node_type = 'project') THEN
    INSERT INTO career_graph_nodes (node_type, title, description, category, difficulty_level, estimated_time_hours, has_hands_on_projects) VALUES
    ('project', 'Data Analysis Dashboard', 'Build an interactive dashboard using Python and data visualization libraries', 'Data Science', 4, 120, true);
  END IF;
END $$;
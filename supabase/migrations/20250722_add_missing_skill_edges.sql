
-- Add missing prerequisite relationships to improve skill tree connectivity
-- These relationships are based on logical skill dependencies

INSERT INTO skill_graph_edges (prerequisite_skill_id, skill_id)
SELECT 
  (SELECT id FROM skills WHERE name = prereq_name),
  (SELECT id FROM skills WHERE name = skill_name)
FROM (VALUES
  -- HTML as foundation for many web technologies
  ('HTML', 'CSS'),
  ('HTML', 'JavaScript'),
  
  -- CSS dependencies
  ('CSS', 'Tailwind CSS'),
  ('CSS', 'Bootstrap'),
  
  -- JavaScript as foundation for frameworks
  ('JavaScript', 'React'),
  ('JavaScript', 'Vue.js'),
  ('JavaScript', 'Angular'),
  ('JavaScript', 'Node.js'),
  ('JavaScript', 'jQuery'),
  
  -- TypeScript builds on JavaScript
  ('JavaScript', 'TypeScript'),
  
  -- Framework dependencies
  ('React', 'Next.js'),
  ('React', 'Gatsby'),
  ('Vue.js', 'Nuxt.js'),
  
  -- Backend dependencies
  ('Node.js', 'Express'),
  ('Node.js', 'Nest.js'),
  ('Python', 'Django'),
  ('Python', 'Flask'),
  ('Python', 'FastAPI'),
  
  -- Database relationships
  ('SQL', 'PostgreSQL'),
  ('SQL', 'MySQL'),
  ('JavaScript', 'MongoDB'),
  
  -- DevOps and Cloud dependencies
  ('Linux', 'Docker'),
  ('Docker', 'Kubernetes'),
  ('Git', 'GitHub Actions'),
  
  -- Testing dependencies
  ('JavaScript', 'Jest'),
  ('React', 'React Testing Library'),
  
  -- API dependencies
  ('HTTP', 'REST API'),
  ('JavaScript', 'GraphQL'),
  
  -- Mobile development
  ('JavaScript', 'React Native'),
  ('Dart', 'Flutter'),
  
  -- Design dependencies
  ('HTML', 'UI/UX Design'),
  ('CSS', 'Responsive Design')
) AS relationships(prereq_name, skill_name)
WHERE 
  (SELECT id FROM skills WHERE name = prereq_name) IS NOT NULL
  AND (SELECT id FROM skills WHERE name = skill_name) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM skill_graph_edges 
    WHERE prerequisite_skill_id = (SELECT id FROM skills WHERE name = prereq_name)
    AND skill_id = (SELECT id FROM skills WHERE name = skill_name)
  );

-- Add some branch relationships for advanced skills
INSERT INTO skill_graph_edges (prerequisite_skill_id, skill_id)
SELECT 
  (SELECT id FROM skills WHERE name = prereq_name),
  (SELECT id FROM skills WHERE name = skill_name)
FROM (VALUES
  -- Advanced framework combinations
  ('TypeScript', 'Next.js'),
  ('CSS', 'Sass'),
  ('CSS', 'Less'),
  
  -- Full-stack combinations
  ('Express', 'MEAN Stack'),
  ('React', 'MERN Stack'),
  
  -- Advanced database skills
  ('PostgreSQL', 'Database Design'),
  ('MongoDB', 'NoSQL'),
  
  -- DevOps progression
  ('Docker', 'Docker Compose'),
  ('Kubernetes', 'Helm'),
  
  -- Advanced testing
  ('Jest', 'Test-Driven Development'),
  ('Cypress', 'End-to-End Testing'),
  
  -- Cloud progression
  ('AWS', 'EC2'),
  ('AWS', 'S3'),
  ('Azure', 'Azure Functions'),
  ('Google Cloud', 'Google App Engine')
) AS relationships(prereq_name, skill_name)
WHERE 
  (SELECT id FROM skills WHERE name = prereq_name) IS NOT NULL
  AND (SELECT id FROM skills WHERE name = skill_name) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM skill_graph_edges 
    WHERE prerequisite_skill_id = (SELECT id FROM skills WHERE name = prereq_name)
    AND skill_id = (SELECT id FROM skills WHERE name = skill_name)
  );


-- First, let's add meaningful skill prerequisites to skill_branches table
-- These represent logical skill progressions (e.g., HTML before CSS before JavaScript)

INSERT INTO skill_branches (from_skill_id, to_skill_id, type, recommended, reasoning) 
SELECT 
  s1.id as from_skill_id,
  s2.id as to_skill_id,
  'prerequisite' as type,
  true as recommended,
  'Essential foundation skill for progression' as reasoning
FROM skills s1 
CROSS JOIN skills s2
WHERE 
  -- Web Development Prerequisites
  (s1.name = 'HTML' AND s2.name IN ('CSS', 'JavaScript', 'React', 'Vue.js', 'Angular')) OR
  (s1.name = 'CSS' AND s2.name IN ('JavaScript', 'React', 'Vue.js', 'Angular', 'Sass', 'Bootstrap')) OR
  (s1.name = 'JavaScript' AND s2.name IN ('React', 'Vue.js', 'Angular', 'Node.js', 'Express.js', 'TypeScript')) OR
  (s1.name = 'React' AND s2.name IN ('Next.js', 'Redux', 'React Native')) OR
  
  -- Data Science Prerequisites  
  (s1.name = 'Python' AND s2.name IN ('Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Django', 'Flask')) OR
  (s1.name = 'SQL' AND s2.name IN ('PostgreSQL', 'MySQL', 'Database Design', 'Data Warehousing')) OR
  (s1.name = 'Statistics' AND s2.name IN ('Machine Learning', 'Data Science', 'R', 'Scikit-learn')) OR
  (s1.name = 'NumPy' AND s2.name IN ('Pandas', 'Scikit-learn', 'TensorFlow', 'PyTorch')) OR
  (s1.name = 'Pandas' AND s2.name IN ('Machine Learning', 'Data Analysis', 'Scikit-learn')) OR
  
  -- DevOps Prerequisites
  (s1.name = 'Linux' AND s2.name IN ('Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Ansible')) OR
  (s1.name = 'Git' AND s2.name IN ('GitHub', 'GitLab', 'CI/CD', 'Jenkins')) OR
  (s1.name = 'Docker' AND s2.name IN ('Kubernetes', 'Docker Compose')) OR
  
  -- Mobile Development Prerequisites
  (s1.name = 'JavaScript' AND s2.name IN ('React Native', 'Ionic')) OR
  (s1.name = 'Java' AND s2.name IN ('Android Development', 'Spring Boot', 'Kotlin')) OR
  (s1.name = 'Swift' AND s2.name IN ('iOS Development', 'SwiftUI')) OR
  
  -- Backend Prerequisites
  (s1.name = 'Python' AND s2.name IN ('Django', 'Flask', 'FastAPI')) OR
  (s1.name = 'JavaScript' AND s2.name IN ('Node.js', 'Express.js')) OR
  (s1.name = 'Node.js' AND s2.name IN ('Express.js', 'NestJS')) OR
  (s1.name = 'Java' AND s2.name IN ('Spring Boot', 'Spring Framework')) OR
  
  -- Design Prerequisites
  (s1.name = 'Design Principles' AND s2.name IN ('UI/UX Design', 'Graphic Design', 'Web Design')) OR
  (s1.name = 'UI/UX Design' AND s2.name IN ('Figma', 'Adobe XD', 'Sketch', 'Prototyping'))

ON CONFLICT DO NOTHING;

-- Add comprehensive course-skill mappings
-- This creates stronger relationships between courses and the skills they teach

INSERT INTO course_skill_map (course_id, skill_id)
SELECT DISTINCT
  rc.id as course_id,
  s.id as skill_id
FROM recommended_courses rc
CROSS JOIN skills s
WHERE 
  -- Map courses to skills based on course titles and skill tags
  (
    -- Web Development Courses
    (rc.title ILIKE '%html%' AND s.name IN ('HTML', 'CSS', 'Web Development')) OR
    (rc.title ILIKE '%css%' AND s.name IN ('CSS', 'HTML', 'Web Development', 'Sass', 'Bootstrap')) OR
    (rc.title ILIKE '%javascript%' AND s.name IN ('JavaScript', 'HTML', 'CSS', 'React', 'Node.js')) OR
    (rc.title ILIKE '%react%' AND s.name IN ('React', 'JavaScript', 'HTML', 'CSS', 'Redux', 'Next.js')) OR
    (rc.title ILIKE '%node%' AND s.name IN ('Node.js', 'JavaScript', 'Express.js', 'MongoDB')) OR
    (rc.title ILIKE '%full stack%' AND s.name IN ('JavaScript', 'React', 'Node.js', 'HTML', 'CSS', 'SQL', 'MongoDB')) OR
    
    -- Data Science Courses
    (rc.title ILIKE '%python%' AND s.name IN ('Python', 'Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn')) OR
    (rc.title ILIKE '%data science%' AND s.name IN ('Python', 'R', 'SQL', 'Statistics', 'Machine Learning', 'Pandas', 'NumPy')) OR
    (rc.title ILIKE '%machine learning%' AND s.name IN ('Machine Learning', 'Python', 'Scikit-learn', 'TensorFlow', 'Statistics', 'NumPy', 'Pandas')) OR
    (rc.title ILIKE '%sql%' AND s.name IN ('SQL', 'Database Design', 'PostgreSQL', 'MySQL', 'Data Analysis')) OR
    (rc.title ILIKE '%statistics%' AND s.name IN ('Statistics', 'R', 'Python', 'Data Analysis', 'Machine Learning')) OR
    
    -- DevOps Courses
    (rc.title ILIKE '%docker%' AND s.name IN ('Docker', 'Linux', 'Kubernetes', 'DevOps', 'Container Technology')) OR
    (rc.title ILIKE '%kubernetes%' AND s.name IN ('Kubernetes', 'Docker', 'Linux', 'DevOps', 'Cloud Computing')) OR
    (rc.title ILIKE '%aws%' AND s.name IN ('AWS', 'Cloud Computing', 'Linux', 'DevOps', 'Docker')) OR
    (rc.title ILIKE '%devops%' AND s.name IN ('DevOps', 'Linux', 'Git', 'Docker', 'Jenkins', 'CI/CD')) OR
    
    -- Mobile Development Courses
    (rc.title ILIKE '%android%' AND s.name IN ('Android Development', 'Java', 'Kotlin', 'Mobile Development')) OR
    (rc.title ILIKE '%ios%' AND s.name IN ('iOS Development', 'Swift', 'Mobile Development', 'SwiftUI')) OR
    (rc.title ILIKE '%react native%' AND s.name IN ('React Native', 'JavaScript', 'React', 'Mobile Development')) OR
    
    -- Design Courses
    (rc.title ILIKE '%ui%' OR rc.title ILIKE '%ux%' AND s.name IN ('UI/UX Design', 'Design Principles', 'Figma', 'Adobe XD')) OR
    (rc.title ILIKE '%figma%' AND s.name IN ('Figma', 'UI/UX Design', 'Design Principles', 'Prototyping'))
  )
ON CONFLICT DO NOTHING;

-- Add career step to skill relationships for better learning paths
INSERT INTO career_step_skills (step_id, skill_id, importance_score)
SELECT DISTINCT
  cs.id as step_id,
  s.id as skill_id,
  CASE 
    WHEN array_position(cs.skill_ids, s.id) <= 3 THEN 5  -- High importance for primary skills
    WHEN array_position(cs.skill_ids, s.id) <= 6 THEN 3  -- Medium importance 
    ELSE 1  -- Low importance
  END as importance_score
FROM career_steps cs
CROSS JOIN skills s
WHERE 
  cs.skill_ids IS NOT NULL 
  AND s.id = ANY(cs.skill_ids)
ON CONFLICT DO NOTHING;

-- Add additional skill relationships based on career step progressions
INSERT INTO career_step_skills (step_id, skill_id, importance_score)
SELECT DISTINCT
  cs.id as step_id,
  s.id as skill_id,
  2 as importance_score  -- Medium-low importance for related skills
FROM career_steps cs
CROSS JOIN skills s
WHERE 
  -- Add HTML/CSS to all web development steps
  (cs.title ILIKE '%web%' OR cs.title ILIKE '%frontend%' OR cs.title ILIKE '%react%' OR cs.title ILIKE '%javascript%') 
  AND s.name IN ('HTML', 'CSS', 'JavaScript') OR
  
  -- Add Python fundamentals to all data science steps  
  (cs.title ILIKE '%data%' OR cs.title ILIKE '%analytics%' OR cs.title ILIKE '%machine learning%')
  AND s.name IN ('Python', 'SQL', 'Statistics') OR
  
  -- Add Linux/Git to all DevOps steps
  (cs.title ILIKE '%devops%' OR cs.title ILIKE '%infrastructure%' OR cs.title ILIKE '%deployment%')
  AND s.name IN ('Linux', 'Git', 'Docker') OR
  
  -- Add design fundamentals to UI/UX steps
  (cs.title ILIKE '%design%' OR cs.title ILIKE '%ui%' OR cs.title ILIKE '%ux%')
  AND s.name IN ('Design Principles', 'UI/UX Design', 'Figma')
ON CONFLICT DO NOTHING;
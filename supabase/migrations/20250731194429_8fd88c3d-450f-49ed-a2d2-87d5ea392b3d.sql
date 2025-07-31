-- Phase 1.95: Critical Course System Fixes
-- Priority 1: Fix Course Substitution Groups

-- Create meaningful substitution groups for courses
UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('React Fundamentals', 'Advanced React Patterns', 'React Native Development');

UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('Intro to UX Design', 'Advanced UX Research', 'UX/UI Design Bootcamp');

UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('Python for Data Science', 'Advanced Python Programming', 'Python Web Development');

UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('JavaScript Essentials', 'Modern JavaScript (ES6+)', 'Node.js Development');

UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('Machine Learning Fundamentals', 'Deep Learning with TensorFlow', 'AI/ML Engineering');

UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('Cloud Computing with AWS', 'DevOps Fundamentals', 'Kubernetes Mastery');

UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('Cybersecurity Basics', 'Ethical Hacking', 'Information Security Management');

UPDATE career_graph_nodes SET substitution_group_id = gen_random_uuid() 
WHERE node_type = 'course' AND title IN ('Accessibility Fundamentals', 'Mobile App Development', 'Full Stack Development');

-- Priority 2: Add Missing Course Metadata with realistic values
UPDATE career_graph_nodes SET 
  estimated_time_hours = CASE title
    WHEN 'React Fundamentals' THEN 40
    WHEN 'Advanced React Patterns' THEN 60
    WHEN 'React Native Development' THEN 80
    WHEN 'Intro to UX Design' THEN 30
    WHEN 'Advanced UX Research' THEN 50
    WHEN 'UX/UI Design Bootcamp' THEN 120
    WHEN 'Python for Data Science' THEN 70
    WHEN 'Advanced Python Programming' THEN 90
    WHEN 'Python Web Development' THEN 85
    WHEN 'JavaScript Essentials' THEN 35
    WHEN 'Modern JavaScript (ES6+)' THEN 45
    WHEN 'Node.js Development' THEN 65
    WHEN 'Machine Learning Fundamentals' THEN 100
    WHEN 'Deep Learning with TensorFlow' THEN 120
    WHEN 'AI/ML Engineering' THEN 140
    WHEN 'Cloud Computing with AWS' THEN 75
    WHEN 'DevOps Fundamentals' THEN 55
    WHEN 'Kubernetes Mastery' THEN 85
    WHEN 'Cybersecurity Basics' THEN 60
    WHEN 'Ethical Hacking' THEN 95
    WHEN 'Information Security Management' THEN 70
    WHEN 'Accessibility Fundamentals' THEN 25
    WHEN 'Mobile App Development' THEN 110
    WHEN 'Full Stack Development' THEN 150
    ELSE 50
  END,
  cost_estimate = CASE title
    WHEN 'React Fundamentals' THEN 299
    WHEN 'Advanced React Patterns' THEN 399
    WHEN 'React Native Development' THEN 499
    WHEN 'Intro to UX Design' THEN 199
    WHEN 'Advanced UX Research' THEN 349
    WHEN 'UX/UI Design Bootcamp' THEN 899
    WHEN 'Python for Data Science' THEN 449
    WHEN 'Advanced Python Programming' THEN 549
    WHEN 'Python Web Development' THEN 499
    WHEN 'JavaScript Essentials' THEN 249
    WHEN 'Modern JavaScript (ES6+)' THEN 329
    WHEN 'Node.js Development' THEN 399
    WHEN 'Machine Learning Fundamentals' THEN 699
    WHEN 'Deep Learning with TensorFlow' THEN 799
    WHEN 'AI/ML Engineering' THEN 999
    WHEN 'Cloud Computing with AWS' THEN 449
    WHEN 'DevOps Fundamentals' THEN 349
    WHEN 'Kubernetes Mastery' THEN 549
    WHEN 'Cybersecurity Basics' THEN 399
    WHEN 'Ethical Hacking' THEN 649
    WHEN 'Information Security Management' THEN 499
    WHEN 'Accessibility Fundamentals' THEN 149
    WHEN 'Mobile App Development' THEN 799
    WHEN 'Full Stack Development' THEN 1199
    ELSE 299
  END,
  difficulty_level = CASE title
    WHEN 'Intro to UX Design' THEN 1
    WHEN 'JavaScript Essentials' THEN 1
    WHEN 'Accessibility Fundamentals' THEN 1
    WHEN 'Cybersecurity Basics' THEN 1
    WHEN 'React Fundamentals' THEN 2
    WHEN 'Python for Data Science' THEN 2
    WHEN 'DevOps Fundamentals' THEN 2
    WHEN 'Modern JavaScript (ES6+)' THEN 2
    WHEN 'Advanced UX Research' THEN 3
    WHEN 'Node.js Development' THEN 3
    WHEN 'Cloud Computing with AWS' THEN 3
    WHEN 'Advanced Python Programming' THEN 3
    WHEN 'Information Security Management' THEN 3
    WHEN 'Advanced React Patterns' THEN 4
    WHEN 'React Native Development' THEN 4
    WHEN 'Machine Learning Fundamentals' THEN 4
    WHEN 'Kubernetes Mastery' THEN 4
    WHEN 'Python Web Development' THEN 4
    WHEN 'UX/UI Design Bootcamp' THEN 4
    WHEN 'Ethical Hacking' THEN 4
    WHEN 'Mobile App Development' THEN 4
    WHEN 'Deep Learning with TensorFlow' THEN 5
    WHEN 'AI/ML Engineering' THEN 5
    WHEN 'Full Stack Development' THEN 5
    ELSE 3
  END,
  ai_confidence_score = CASE difficulty_level
    WHEN 1 THEN 0.95
    WHEN 2 THEN 0.90
    WHEN 3 THEN 0.85
    WHEN 4 THEN 0.80
    WHEN 5 THEN 0.75
    ELSE 0.85
  END
WHERE node_type = 'course';

-- Priority 3: Expand Course-Skill Teaching Connections
-- Add comprehensive TEACHES edges from courses to skills

-- React courses teach React skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title IN ('React Fundamentals', 'Advanced React Patterns', 'React Native Development')
  AND s.title IN ('React', 'Component Development', 'State Management', 'Frontend Development')
ON CONFLICT DO NOTHING;

-- UX courses teach UX skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title IN ('Intro to UX Design', 'Advanced UX Research', 'UX/UI Design Bootcamp')
  AND s.title IN ('UX Fundamentals', 'User Research', 'Wireframing', 'Design Systems', 'Information Architecture')
ON CONFLICT DO NOTHING;

-- Python courses teach Python skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title IN ('Python for Data Science', 'Advanced Python Programming', 'Python Web Development')
  AND s.title IN ('Python', 'Data Analysis', 'Backend Development', 'API Development', 'Database Design')
ON CONFLICT DO NOTHING;

-- JavaScript courses teach JavaScript skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title IN ('JavaScript Essentials', 'Modern JavaScript (ES6+)', 'Node.js Development')
  AND s.title IN ('JavaScript', 'Frontend Development', 'Backend Development', 'API Development', 'Testing')
ON CONFLICT DO NOTHING;

-- ML/AI courses teach ML skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title IN ('Machine Learning Fundamentals', 'Deep Learning with TensorFlow', 'AI/ML Engineering')
  AND s.title IN ('Machine Learning', 'Data Analysis', 'Python', 'Statistical Analysis', 'Algorithm Design')
ON CONFLICT DO NOTHING;

-- DevOps/Cloud courses teach infrastructure skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title IN ('Cloud Computing with AWS', 'DevOps Fundamentals', 'Kubernetes Mastery')
  AND s.title IN ('Cloud Architecture', 'System Administration', 'DevOps', 'Container Orchestration', 'Infrastructure Management')
ON CONFLICT DO NOTHING;

-- Security courses teach security skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title IN ('Cybersecurity Basics', 'Ethical Hacking', 'Information Security Management')
  AND s.title IN ('Cybersecurity', 'Network Security', 'Risk Assessment', 'Compliance Management', 'Security Analysis')
ON CONFLICT DO NOTHING;

-- Miscellaneous courses teach foundational skills
INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title = 'Accessibility Fundamentals' AND s.title IN ('Web Accessibility', 'UX Fundamentals', 'Frontend Development')
ON CONFLICT DO NOTHING;

INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title = 'Mobile App Development' AND s.title IN ('Mobile Development', 'React', 'UX Fundamentals', 'Frontend Development')
ON CONFLICT DO NOTHING;

INSERT INTO career_graph_edges (from_id, to_id, edge_type, from_type, to_type, confidence_score, importance_weight, semantic_strength)
SELECT c.id, s.id, 'TEACHES', 'course', 'skill', 0.9, 1.0, 0.95
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' AND s.node_type = 'skill'
  AND c.title = 'Full Stack Development' AND s.title IN ('Frontend Development', 'Backend Development', 'Database Design', 'API Development', 'Testing')
ON CONFLICT DO NOTHING;
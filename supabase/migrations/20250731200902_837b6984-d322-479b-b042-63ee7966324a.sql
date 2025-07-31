-- Phase 1.96: Final Critical Fixes for Phase 2 Readiness (Fixed)

-- First, add the unique constraint that's missing for career_graph_edges
ALTER TABLE career_graph_edges 
ADD CONSTRAINT unique_edge_relationship 
UNIQUE (from_id, to_id, edge_type);

-- Step 1: Restructure Substitution Groups into 8 meaningful groups
-- Generate consistent UUIDs for substitution groups
DO $$
DECLARE
    react_frontend_group_id UUID := gen_random_uuid();
    javascript_group_id UUID := gen_random_uuid();
    design_group_id UUID := gen_random_uuid();
    backend_group_id UUID := gen_random_uuid();
    cloud_devops_group_id UUID := gen_random_uuid();
    data_science_group_id UUID := gen_random_uuid();
    testing_group_id UUID := gen_random_uuid();
    system_design_group_id UUID := gen_random_uuid();
BEGIN
    -- React/Frontend Framework Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = react_frontend_group_id
    WHERE node_type = 'course' AND title IN (
        'React - The Complete Guide', 
        'Advanced React Patterns', 
        'Next.js: The React Framework'
    );
    
    -- JavaScript Fundamentals Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = javascript_group_id
    WHERE node_type = 'course' AND title IN (
        'JavaScript Fundamentals', 
        'TypeScript Essential Training'
    );
    
    -- Design Skills Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = design_group_id
    WHERE node_type = 'course' AND title IN (
        'Design Systems Fundamentals', 
        'CSS Grid and Flexbox Mastery'
    );
    
    -- Backend Development Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = backend_group_id
    WHERE node_type = 'course' AND title IN (
        'Node.js for Beginners', 
        'Node.js Microservices', 
        'GraphQL Complete Guide'
    );
    
    -- Cloud/DevOps Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = cloud_devops_group_id
    WHERE node_type = 'course' AND title IN (
        'AWS Cloud Practitioner', 
        'Docker Fundamentals', 
        'Kubernetes Certification Guide'
    );
    
    -- Data Science Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = data_science_group_id
    WHERE node_type = 'course' AND title IN (
        'Deep Learning Specialization', 
        'MLOps with Kubeflow', 
        'Computer Vision with PyTorch'
    );
    
    -- Testing Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = testing_group_id
    WHERE node_type = 'course' AND title IN (
        'Testing with Jest & Cypress'
    );
    
    -- System Design Group
    UPDATE career_graph_nodes 
    SET substitution_group_id = system_design_group_id
    WHERE node_type = 'course' AND title IN (
        'System Design Fundamentals', 
        'System Design Interview'
    );
END $$;

-- Step 2: Complete Missing TEACHES Connections
-- Remove existing duplicate edges first
DELETE FROM career_graph_edges 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY from_id, to_id, edge_type ORDER BY created_at) as rn
        FROM career_graph_edges
    ) t WHERE rn > 1
);

-- Add comprehensive TEACHES edges for all courses
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, semantic_strength, importance_weight)
SELECT 
    c.id as from_id,
    s.id as to_id,
    'course' as from_type,
    'skill' as to_type,
    'teaches' as edge_type,
    0.9 as confidence_score,
    0.8 as semantic_strength,
    1.0 as importance_weight
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' 
AND s.node_type = 'skill'
AND (
    -- React Complete Guide teaches React, JavaScript, Component Architecture, State Management
    (c.title = 'React - The Complete Guide' AND s.title IN ('React', 'JavaScript', 'Component Architecture', 'State Management')) OR
    
    -- Advanced React Patterns teaches React, Component Architecture, State Management, Performance Optimization
    (c.title = 'Advanced React Patterns' AND s.title IN ('React', 'Component Architecture', 'State Management', 'Performance Optimization')) OR
    
    -- Next.js teaches React, Server-Side Rendering, Full Stack Development, Web Development
    (c.title = 'Next.js: The React Framework' AND s.title IN ('React', 'Server-Side Rendering', 'Full Stack Development', 'Web Development')) OR
    
    -- JavaScript Fundamentals teaches JavaScript, Programming Fundamentals, DOM Manipulation
    (c.title = 'JavaScript Fundamentals' AND s.title IN ('JavaScript', 'Programming Fundamentals', 'DOM Manipulation')) OR
    
    -- TypeScript teaches TypeScript, JavaScript, Type Safety, Code Quality
    (c.title = 'TypeScript Essential Training' AND s.title IN ('TypeScript', 'JavaScript', 'Type Safety', 'Code Quality')) OR
    
    -- Design Systems teaches Design Systems, UI/UX Design, Component Architecture
    (c.title = 'Design Systems Fundamentals' AND s.title IN ('Design Systems', 'UI/UX Design', 'Component Architecture')) OR
    
    -- CSS Grid teaches CSS, Responsive Design, Layout Design
    (c.title = 'CSS Grid and Flexbox Mastery' AND s.title IN ('CSS', 'Responsive Design', 'Layout Design')) OR
    
    -- Node.js Beginners teaches Node.js, JavaScript, Backend Development
    (c.title = 'Node.js for Beginners' AND s.title IN ('Node.js', 'JavaScript', 'Backend Development')) OR
    
    -- Node.js Microservices teaches Node.js, Microservices, System Architecture, Backend Development
    (c.title = 'Node.js Microservices' AND s.title IN ('Node.js', 'Microservices', 'System Architecture', 'Backend Development')) OR
    
    -- GraphQL teaches GraphQL, API Development, Backend Development
    (c.title = 'GraphQL Complete Guide' AND s.title IN ('GraphQL', 'API Development', 'Backend Development')) OR
    
    -- AWS teaches Cloud Computing, AWS, Infrastructure, DevOps
    (c.title = 'AWS Cloud Practitioner' AND s.title IN ('Cloud Computing', 'AWS', 'Infrastructure', 'DevOps')) OR
    
    -- Docker teaches Docker, Containerization, DevOps, Infrastructure
    (c.title = 'Docker Fundamentals' AND s.title IN ('Docker', 'Containerization', 'DevOps', 'Infrastructure')) OR
    
    -- Kubernetes teaches Kubernetes, Container Orchestration, DevOps, Infrastructure
    (c.title = 'Kubernetes Certification Guide' AND s.title IN ('Kubernetes', 'Container Orchestration', 'DevOps', 'Infrastructure')) OR
    
    -- Deep Learning teaches Machine Learning, Deep Learning, Neural Networks, AI
    (c.title = 'Deep Learning Specialization' AND s.title IN ('Machine Learning', 'Deep Learning', 'Neural Networks', 'AI')) OR
    
    -- MLOps teaches Machine Learning, MLOps, DevOps, Data Engineering
    (c.title = 'MLOps with Kubeflow' AND s.title IN ('Machine Learning', 'MLOps', 'DevOps', 'Data Engineering')) OR
    
    -- Computer Vision teaches Computer Vision, Machine Learning, Deep Learning, Python
    (c.title = 'Computer Vision with PyTorch' AND s.title IN ('Computer Vision', 'Machine Learning', 'Deep Learning', 'Python')) OR
    
    -- Testing teaches Testing, Quality Assurance, JavaScript, Test Automation
    (c.title = 'Testing with Jest & Cypress' AND s.title IN ('Testing', 'Quality Assurance', 'JavaScript', 'Test Automation')) OR
    
    -- System Design Fundamentals teaches System Design, Software Architecture, Scalability
    (c.title = 'System Design Fundamentals' AND s.title IN ('System Design', 'Software Architecture', 'Scalability')) OR
    
    -- System Design Interview teaches System Design, Software Architecture, Problem Solving
    (c.title = 'System Design Interview' AND s.title IN ('System Design', 'Software Architecture', 'Problem Solving'))
)
AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges existing 
    WHERE existing.from_id = c.id 
    AND existing.to_id = s.id 
    AND existing.edge_type = 'teaches'
);

-- Step 3: Diversify Course Metadata with realistic pricing and time estimates
UPDATE career_graph_nodes 
SET 
    cost_estimate = CASE 
        WHEN difficulty_level = 1 THEN 99   -- Beginner courses
        WHEN difficulty_level = 2 THEN 199  -- Intermediate courses  
        WHEN difficulty_level = 3 THEN 299  -- Advanced courses
        ELSE 199
    END,
    estimated_time_hours = CASE 
        WHEN title IN ('JavaScript Fundamentals', 'CSS Grid and Flexbox Mastery', 'Docker Fundamentals') THEN 25
        WHEN title IN ('TypeScript Essential Training', 'Node.js for Beginners', 'AWS Cloud Practitioner', 'Testing with Jest & Cypress') THEN 35
        WHEN title IN ('React - The Complete Guide', 'Design Systems Fundamentals', 'GraphQL Complete Guide', 'Kubernetes Certification Guide') THEN 45
        WHEN title IN ('Advanced React Patterns', 'Next.js: The React Framework', 'Node.js Microservices', 'Computer Vision with PyTorch') THEN 60
        WHEN title IN ('Deep Learning Specialization', 'MLOps with Kubeflow', 'System Design Fundamentals', 'System Design Interview') THEN 80
        ELSE 40
    END,
    difficulty_level = CASE 
        WHEN title IN ('JavaScript Fundamentals', 'Node.js for Beginners', 'Docker Fundamentals', 'AWS Cloud Practitioner') THEN 1
        WHEN title IN ('TypeScript Essential Training', 'React - The Complete Guide', 'CSS Grid and Flexbox Mastery', 'Design Systems Fundamentals', 'GraphQL Complete Guide', 'Testing with Jest & Cypress') THEN 2
        WHEN title IN ('Advanced React Patterns', 'Next.js: The React Framework', 'Node.js Microservices', 'Kubernetes Certification Guide', 'Deep Learning Specialization', 'MLOps with Kubeflow', 'Computer Vision with PyTorch', 'System Design Fundamentals', 'System Design Interview') THEN 3
        ELSE 2
    END,
    ai_confidence_score = CASE 
        WHEN title IN ('React - The Complete Guide', 'JavaScript Fundamentals', 'Node.js for Beginners', 'AWS Cloud Practitioner') THEN 0.95
        WHEN title IN ('TypeScript Essential Training', 'Advanced React Patterns', 'Next.js: The React Framework', 'Design Systems Fundamentals', 'CSS Grid and Flexbox Mastery', 'GraphQL Complete Guide', 'Docker Fundamentals', 'Testing with Jest & Cypress') THEN 0.90
        WHEN title IN ('Node.js Microservices', 'Kubernetes Certification Guide', 'Deep Learning Specialization', 'MLOps with Kubeflow', 'Computer Vision with PyTorch', 'System Design Fundamentals', 'System Design Interview') THEN 0.85
        ELSE 0.88
    END,
    trending_score = CASE 
        WHEN title IN ('React - The Complete Guide', 'Next.js: The React Framework', 'TypeScript Essential Training', 'Kubernetes Certification Guide', 'Deep Learning Specialization') THEN 0.9
        WHEN title IN ('Advanced React Patterns', 'JavaScript Fundamentals', 'Docker Fundamentals', 'MLOps with Kubeflow', 'Computer Vision with PyTorch') THEN 0.8
        WHEN title IN ('Node.js for Beginners', 'Node.js Microservices', 'GraphQL Complete Guide', 'AWS Cloud Practitioner', 'System Design Fundamentals') THEN 0.7
        ELSE 0.6
    END,
    market_demand_score = CASE 
        WHEN title IN ('React - The Complete Guide', 'JavaScript Fundamentals', 'Node.js for Beginners', 'AWS Cloud Practitioner', 'System Design Fundamentals') THEN 0.95
        WHEN title IN ('TypeScript Essential Training', 'Next.js: The React Framework', 'Docker Fundamentals', 'Kubernetes Certification Guide', 'Testing with Jest & Cypress') THEN 0.85
        WHEN title IN ('Advanced React Patterns', 'Design Systems Fundamentals', 'GraphQL Complete Guide', 'Deep Learning Specialization', 'System Design Interview') THEN 0.75
        ELSE 0.70
    END
WHERE node_type = 'course';
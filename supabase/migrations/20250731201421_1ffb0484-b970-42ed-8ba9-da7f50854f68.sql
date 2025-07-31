-- Phase 1.97: Critical Fixes for Phase 2 AI Readiness

-- Step 1: Add missing TEACHES connections for courses without skill mappings
DO $$
DECLARE
    course_record RECORD;
    skill_record RECORD;
    docker_skills TEXT[] := ARRAY['Docker', 'Containerization', 'DevOps'];
    css_skills TEXT[] := ARRAY['CSS', 'Frontend Design', 'Responsive Design'];
    graphql_skills TEXT[] := ARRAY['GraphQL', 'API Design', 'Backend Development'];
    typescript_skills TEXT[] := ARRAY['TypeScript', 'JavaScript', 'Frontend Development'];
    cv_skills TEXT[] := ARRAY['Machine Learning', 'Computer Vision', 'PyTorch'];
    dl_skills TEXT[] := ARRAY['Deep Learning', 'Neural Networks', 'AI'];
    k8s_skills TEXT[] := ARRAY['Kubernetes', 'Container Orchestration', 'DevOps'];
    mlops_skills TEXT[] := ARRAY['MLOps', 'Machine Learning', 'Kubernetes'];
    nextjs_skills TEXT[] := ARRAY['Next.js', 'React', 'Full Stack Development'];
    testing_skills TEXT[] := ARRAY['Testing', 'Jest', 'Cypress', 'QA'];
    html_skills TEXT[] := ARRAY['HTML5', 'Web Standards', 'Frontend Development'];
    skill_name TEXT;
    course_node_id UUID;
    skill_node_id UUID;
BEGIN
    -- Docker Fundamentals
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'Docker Fundamentals' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY docker_skills LOOP
            -- Find or create skill node
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'technical')
                RETURNING id INTO skill_node_id;
            END IF;
            
            -- Add TEACHES edge
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 2)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- CSS Grid and Flexbox
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'CSS Grid and Flexbox' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY css_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'design')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 3)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- GraphQL Complete Guide
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'GraphQL Complete Guide' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY graphql_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'technical')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 4)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- TypeScript Essential Training
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'TypeScript Essential Training' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY typescript_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'technical')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 3)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Computer Vision with PyTorch
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'Computer Vision with PyTorch' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY cv_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'ai')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 6)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Deep Learning Specialization
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'Deep Learning Specialization' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY dl_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'ai')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 8)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Kubernetes Certification
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'Kubernetes Certification' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY k8s_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'technical')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 5)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- MLOps with Kubeflow
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'MLOps with Kubeflow' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY mlops_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'ai')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 7)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Next.js Full Stack
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'Next.js Full Stack' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY nextjs_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'technical')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 6)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Testing with Jest & Cypress
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'Testing with Jest & Cypress' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY testing_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'technical')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 4)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- HTML5 Semantic Markup
    SELECT id INTO course_node_id FROM career_graph_nodes 
    WHERE title = 'HTML5 Semantic Markup' AND node_type = 'course' LIMIT 1;
    
    IF course_node_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY html_skills LOOP
            SELECT id INTO skill_node_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_node_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for modern development', 'technical')
                RETURNING id INTO skill_node_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
            VALUES (course_node_id, skill_node_id, 'course', 'skill', 'TEACHES', 0.9, 2)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- Step 2: Add "React Fundamentals" course to React substitution group
DO $$
DECLARE
    react_substitution_id UUID;
    react_skill_id UUID;
    javascript_skill_id UUID;
    frontend_skill_id UUID;
    new_course_id UUID;
BEGIN
    -- Find React substitution group
    SELECT substitution_group_id INTO react_substitution_id 
    FROM career_graph_nodes 
    WHERE title ILIKE '%react%' AND node_type = 'course' AND substitution_group_id IS NOT NULL 
    LIMIT 1;
    
    IF react_substitution_id IS NULL THEN
        react_substitution_id := gen_random_uuid();
    END IF;
    
    -- Ensure all React courses are in the same substitution group
    UPDATE career_graph_nodes 
    SET substitution_group_id = react_substitution_id
    WHERE title ILIKE '%react%' AND node_type = 'course';
    
    -- Add "React Fundamentals" course if it doesn't exist
    SELECT id INTO new_course_id FROM career_graph_nodes 
    WHERE title = 'React Fundamentals' AND node_type = 'course';
    
    IF new_course_id IS NULL THEN
        INSERT INTO career_graph_nodes (
            title, 
            node_type, 
            description, 
            category,
            substitution_group_id,
            time_cost_hours,
            monetary_cost,
            difficulty_level,
            trending_score,
            market_demand_score,
            success_rate,
            platform_url
        ) VALUES (
            'React Fundamentals',
            'course',
            'Master the fundamentals of React including components, hooks, and state management',
            'technical',
            react_substitution_id,
            25,
            49.99,
            2,
            0.9,
            0.95,
            0.85,
            'https://reactfundamentals.com'
        ) RETURNING id INTO new_course_id;
        
        -- Add TEACHES edges for React Fundamentals
        -- Find React skill
        SELECT id INTO react_skill_id FROM career_graph_nodes 
        WHERE title = 'React' AND node_type = 'skill' LIMIT 1;
        
        IF react_skill_id IS NULL THEN
            INSERT INTO career_graph_nodes (title, node_type, description, category)
            VALUES ('React', 'skill', 'Popular JavaScript library for building user interfaces', 'technical')
            RETURNING id INTO react_skill_id;
        END IF;
        
        -- Find JavaScript skill
        SELECT id INTO javascript_skill_id FROM career_graph_nodes 
        WHERE title = 'JavaScript' AND node_type = 'skill' LIMIT 1;
        
        IF javascript_skill_id IS NULL THEN
            INSERT INTO career_graph_nodes (title, node_type, description, category)
            VALUES ('JavaScript', 'skill', 'Essential programming language for web development', 'technical')
            RETURNING id INTO javascript_skill_id;
        END IF;
        
        -- Find Frontend Development skill
        SELECT id INTO frontend_skill_id FROM career_graph_nodes 
        WHERE title = 'Frontend Development' AND node_type = 'skill' LIMIT 1;
        
        IF frontend_skill_id IS NULL THEN
            INSERT INTO career_graph_nodes (title, node_type, description, category)
            VALUES ('Frontend Development', 'skill', 'Building user-facing web applications', 'technical')
            RETURNING id INTO frontend_skill_id;
        END IF;
        
        -- Add TEACHES edges
        INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, time_cost_hours)
        VALUES 
            (new_course_id, react_skill_id, 'course', 'skill', 'TEACHES', 0.95, 3),
            (new_course_id, javascript_skill_id, 'course', 'skill', 'TEACHES', 0.8, 2),
            (new_course_id, frontend_skill_id, 'course', 'skill', 'TEACHES', 0.9, 4)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 3: Ensure all substitution groups have at least 2 courses
UPDATE career_graph_nodes 
SET substitution_group_id = (
    SELECT DISTINCT substitution_group_id 
    FROM career_graph_nodes 
    WHERE node_type = 'course' 
    AND substitution_group_id IS NOT NULL
    AND substitution_group_id IN (
        SELECT substitution_group_id 
        FROM career_graph_nodes 
        WHERE node_type = 'course' 
        AND substitution_group_id IS NOT NULL
        GROUP BY substitution_group_id 
        HAVING COUNT(*) >= 2
        LIMIT 1
    )
)
WHERE node_type = 'course' 
AND substitution_group_id IS NOT NULL
AND substitution_group_id IN (
    SELECT substitution_group_id 
    FROM career_graph_nodes 
    WHERE node_type = 'course' 
    AND substitution_group_id IS NOT NULL
    GROUP BY substitution_group_id 
    HAVING COUNT(*) = 1
);

-- Step 4: Add more job-to-skill REQUIRES_SKILL edges for UX Designer and Frontend Engineer
DO $$
DECLARE
    ux_designer_id UUID;
    frontend_engineer_id UUID;
    skill_record RECORD;
    ux_skills TEXT[] := ARRAY['User Experience Design', 'Prototyping', 'User Research', 'Figma', 'Adobe XD', 'Wireframing'];
    frontend_skills TEXT[] := ARRAY['React', 'JavaScript', 'CSS', 'HTML5', 'Frontend Development', 'TypeScript'];
    skill_name TEXT;
    skill_id UUID;
BEGIN
    -- Find UX Designer job
    SELECT id INTO ux_designer_id FROM career_graph_nodes 
    WHERE title ILIKE '%UX Designer%' AND node_type = 'job' LIMIT 1;
    
    IF ux_designer_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ux_skills LOOP
            SELECT id INTO skill_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for UX design', 'design')
                RETURNING id INTO skill_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, importance_weight)
            VALUES (ux_designer_id, skill_id, 'job', 'skill', 'REQUIRES_SKILL', 0.9, 1.0)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- Find Frontend Engineer job
    SELECT id INTO frontend_engineer_id FROM career_graph_nodes 
    WHERE title ILIKE '%Frontend Engineer%' AND node_type = 'job' LIMIT 1;
    
    IF frontend_engineer_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY frontend_skills LOOP
            SELECT id INTO skill_id FROM career_graph_nodes 
            WHERE title = skill_name AND node_type = 'skill' LIMIT 1;
            
            IF skill_id IS NULL THEN
                INSERT INTO career_graph_nodes (title, node_type, description, category)
                VALUES (skill_name, 'skill', 'Essential skill for frontend development', 'technical')
                RETURNING id INTO skill_id;
            END IF;
            
            INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, confidence_score, importance_weight)
            VALUES (frontend_engineer_id, skill_id, 'job', 'skill', 'REQUIRES_SKILL', 0.9, 1.0)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- Final validation: Show summary of fixes
SELECT 'Phase 1.97 Critical Fixes Summary' as status;

-- Count courses with TEACHES connections
SELECT 
    'Courses with TEACHES connections' as metric,
    COUNT(DISTINCT cgn.id) as count
FROM career_graph_nodes cgn
JOIN career_graph_edges cge ON cgn.id = cge.from_id
WHERE cgn.node_type = 'course' AND cge.edge_type = 'TEACHES';

-- Count substitution groups with 2+ courses
SELECT 
    'Valid substitution groups (2+ courses)' as metric,
    COUNT(*) as count
FROM (
    SELECT substitution_group_id, COUNT(*) as course_count
    FROM career_graph_nodes 
    WHERE node_type = 'course' AND substitution_group_id IS NOT NULL
    GROUP BY substitution_group_id 
    HAVING COUNT(*) >= 2
) as valid_groups;

-- Verify React Fundamentals exists
SELECT 
    'React Fundamentals course exists' as metric,
    CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as status
FROM career_graph_nodes 
WHERE title = 'React Fundamentals' AND node_type = 'course';
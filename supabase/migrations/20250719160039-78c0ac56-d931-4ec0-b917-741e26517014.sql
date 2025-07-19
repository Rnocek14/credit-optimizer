-- First, create the two new mock users (Aisha Khan already exists)
-- Generate UUIDs that we'll reuse consistently
DO $$
DECLARE
    mateo_user_id uuid := '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid;
    jade_user_id uuid := '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid;
    aisha_user_id uuid := '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;
BEGIN
    -- Insert profiles for new users (Aisha should already exist)
    INSERT INTO public.profiles (user_id, name, role, experience_level, industry, location)
    VALUES 
        (mateo_user_id, 'Mateo Rivera', 'user', 'Mid-level', 'Software Development', 'Austin, TX'),
        (jade_user_id, 'Jade Lin', 'user', 'Senior', 'Data Science', 'San Francisco, CA')
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert career goals
    -- Aisha: 3 goals
    INSERT INTO public.career_goals (user_id, title, description, target_role, target_date, active)
    VALUES 
        (aisha_user_id, 'Master React Development', 'Build expertise in React and modern JavaScript frameworks', 'Frontend Developer', '2025-12-31', true),
        (aisha_user_id, 'Complete AWS Certification', 'Obtain AWS Solutions Architect certification', 'Cloud Developer', '2025-10-31', true),
        (aisha_user_id, 'Build Portfolio Projects', 'Create 3 full-stack applications for portfolio', 'Full Stack Developer', '2025-08-31', true);

    -- Mateo: 4 goals  
    INSERT INTO public.career_goals (user_id, title, description, target_role, target_date, active)
    VALUES 
        (mateo_user_id, 'Transition to Tech Lead', 'Develop leadership and architectural skills', 'Tech Lead', '2026-03-31', true),
        (mateo_user_id, 'Master DevOps Practices', 'Learn Docker, Kubernetes, and CI/CD', 'DevOps Engineer', '2025-11-30', true),
        (mateo_user_id, 'Contribute to Open Source', 'Make meaningful contributions to 3 OSS projects', 'Senior Developer', '2025-09-30', true),
        (mateo_user_id, 'System Design Expertise', 'Master distributed systems and scaling', 'Principal Engineer', '2026-06-30', true);

    -- Jade: 6 goals
    INSERT INTO public.career_goals (user_id, title, description, target_role, target_date, active)
    VALUES 
        (jade_user_id, 'PhD in Machine Learning', 'Complete doctoral research in ML applications', 'ML Research Scientist', '2027-05-31', true),
        (jade_user_id, 'Launch AI Startup', 'Found a company focused on AI solutions', 'CTO/Founder', '2026-12-31', true),
        (jade_user_id, 'Publish Research Papers', 'Publish 5 peer-reviewed papers in top-tier venues', 'Research Scientist', '2025-12-31', true),
        (jade_user_id, 'Master MLOps Pipeline', 'Build production-ready ML deployment systems', 'ML Engineer', '2025-08-31', true),
        (jade_user_id, 'Speak at Major Conferences', 'Present at 3 international AI conferences', 'Thought Leader', '2026-09-30', true),
        (jade_user_id, 'Mentor Next Generation', 'Guide 10+ junior data scientists', 'Senior Data Scientist', '2025-06-30', true);

    -- Insert transcripts (verified course completions)
    -- Aisha: 2 transcripts
    INSERT INTO public.transcripts (user_id, title, description, grade, credits, difficulty, skill_tags, verified, use_in_resume, cri_score)
    VALUES 
        (aisha_user_id, 'React Advanced Patterns', 'Deep dive into React hooks, context, and performance optimization', 'A', 3, 'Advanced', ARRAY['React', 'JavaScript', 'Frontend'], true, true, 85),
        (aisha_user_id, 'AWS Solutions Architecture', 'Comprehensive cloud infrastructure design and implementation', 'A-', 4, 'Advanced', ARRAY['AWS', 'Cloud', 'Architecture'], true, true, 82);

    -- Mateo: 4 transcripts
    INSERT INTO public.transcripts (user_id, title, description, grade, credits, difficulty, skill_tags, verified, use_in_resume, cri_score)
    VALUES 
        (mateo_user_id, 'Kubernetes Administration', 'Container orchestration and cluster management', 'A+', 4, 'Expert', ARRAY['Kubernetes', 'DevOps', 'Containers'], true, true, 92),
        (mateo_user_id, 'System Design Fundamentals', 'Distributed systems, scaling, and architecture patterns', 'A', 3, 'Advanced', ARRAY['System Design', 'Architecture', 'Scalability'], true, true, 88),
        (mateo_user_id, 'Docker Containerization', 'Application containerization and deployment strategies', 'A', 2, 'Intermediate', ARRAY['Docker', 'DevOps', 'Deployment'], true, true, 85),
        (mateo_user_id, 'Advanced JavaScript', 'ES6+, async programming, and performance optimization', 'A-', 3, 'Advanced', ARRAY['JavaScript', 'Programming', 'Performance'], true, true, 87);

    -- Jade: 6 transcripts
    INSERT INTO public.transcripts (user_id, title, description, grade, credits, difficulty, skill_tags, verified, use_in_resume, cri_score)
    VALUES 
        (jade_user_id, 'Deep Learning Specialization', 'Neural networks, CNNs, RNNs, and transformer architectures', 'A+', 6, 'Expert', ARRAY['Deep Learning', 'Neural Networks', 'AI'], true, true, 98),
        (jade_user_id, 'MLOps Engineering', 'Production ML systems, monitoring, and deployment', 'A+', 4, 'Expert', ARRAY['MLOps', 'Machine Learning', 'DevOps'], true, true, 95),
        (jade_user_id, 'Advanced Statistics', 'Bayesian methods, hypothesis testing, and experimental design', 'A', 4, 'Advanced', ARRAY['Statistics', 'Data Science', 'Research'], true, true, 91),
        (jade_user_id, 'Computer Vision', 'Image processing, object detection, and visual recognition', 'A+', 3, 'Expert', ARRAY['Computer Vision', 'Deep Learning', 'AI'], true, true, 96),
        (jade_user_id, 'Natural Language Processing', 'Text analysis, language models, and sentiment analysis', 'A', 3, 'Advanced', ARRAY['NLP', 'Machine Learning', 'AI'], true, true, 93),
        (jade_user_id, 'Research Methodology', 'Scientific research design, data collection, and analysis', 'A+', 2, 'Advanced', ARRAY['Research', 'Academic Writing', 'Statistics'], true, true, 89);

END $$;
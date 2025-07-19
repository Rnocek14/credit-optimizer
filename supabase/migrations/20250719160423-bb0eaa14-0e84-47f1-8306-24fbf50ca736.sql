-- Create comprehensive mock user data system
DO $$
DECLARE
    mateo_user_id uuid := '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid;
    jade_user_id uuid := '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid;
    aisha_user_id uuid := '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;
    
    -- Course IDs for saved courses (we'll generate these)
    course1_id uuid := gen_random_uuid();
    course2_id uuid := gen_random_uuid();
    course3_id uuid := gen_random_uuid();
    course4_id uuid := gen_random_uuid();
    course5_id uuid := gen_random_uuid();
    course6_id uuid := gen_random_uuid();
    course7_id uuid := gen_random_uuid();
    course8_id uuid := gen_random_uuid();
    course9_id uuid := gen_random_uuid();
    course10_id uuid := gen_random_uuid();
BEGIN
    -- Insert profiles for new users (only if they don't exist)
    INSERT INTO public.profiles (user_id, name, role, experience_level, industry, location)
    SELECT mateo_user_id, 'Mateo Rivera', 'user', 'Mid-level', 'Software Development', 'Austin, TX'
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = mateo_user_id);
    
    INSERT INTO public.profiles (user_id, name, role, experience_level, industry, location)
    SELECT jade_user_id, 'Jade Lin', 'user', 'Senior', 'Data Science', 'San Francisco, CA'
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = jade_user_id);

    -- Insert some recommended courses first so we can save them
    INSERT INTO public.recommended_courses (id, mentor_id, title, description, platform, url, cost, difficulty, skill_tags, reasoning, active)
    VALUES 
        (course1_id, aisha_user_id, 'Advanced React Patterns', 'Master advanced React concepts and patterns', 'Udemy', 'https://udemy.com/react-advanced', 'Free', 'Advanced', ARRAY['React', 'JavaScript'], 'Essential for frontend development', true),
        (course2_id, aisha_user_id, 'AWS Cloud Practitioner', 'Introduction to AWS cloud services', 'AWS Training', 'https://aws.amazon.com/training/', '$150', 'Beginner', ARRAY['AWS', 'Cloud'], 'Great starting point for cloud', true),
        (course3_id, aisha_user_id, 'Full Stack Development', 'Complete web development bootcamp', 'FreeCodeCamp', 'https://freecodecamp.org', 'Free', 'Intermediate', ARRAY['JavaScript', 'Node.js', 'React'], 'Comprehensive full-stack training', true),
        (course4_id, mateo_user_id, 'Kubernetes Certification', 'CKA certification preparation course', 'Linux Foundation', 'https://training.linuxfoundation.org', '$300', 'Expert', ARRAY['Kubernetes', 'DevOps'], 'Industry standard container orchestration', true),
        (course5_id, mateo_user_id, 'System Design Interview', 'Comprehensive system design preparation', 'Educative', 'https://educative.io/system-design', '$99', 'Advanced', ARRAY['System Design', 'Architecture'], 'Essential for senior roles', true),
        (course6_id, mateo_user_id, 'Docker Deep Dive', 'Advanced container concepts and best practices', 'Pluralsight', 'https://pluralsight.com/docker', '$29/month', 'Advanced', ARRAY['Docker', 'Containers'], 'Master containerization', true),
        (course7_id, jade_user_id, 'Deep Learning Specialization', 'Comprehensive neural networks course', 'Coursera', 'https://coursera.org/deeplearning', '$49/month', 'Expert', ARRAY['Deep Learning', 'AI'], 'Industry-leading ML course', true),
        (course8_id, jade_user_id, 'MLOps with Kubeflow', 'Production machine learning pipelines', 'Google Cloud', 'https://cloud.google.com/training', '$200', 'Expert', ARRAY['MLOps', 'Kubernetes'], 'Production ML systems', true),
        (course9_id, jade_user_id, 'Computer Vision with PyTorch', 'Advanced computer vision techniques', 'Fast.ai', 'https://fast.ai', 'Free', 'Expert', ARRAY['Computer Vision', 'PyTorch'], 'Practical deep learning', true),
        (course10_id, jade_user_id, 'Research Paper Writing', 'Academic writing for AI researchers', 'MIT OpenCourseWare', 'https://ocw.mit.edu', 'Free', 'Advanced', ARRAY['Academic Writing', 'Research'], 'Essential for PhD track', true);

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

    -- Insert transcripts
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

    -- Insert saved courses
    -- Aisha: 3 saved courses
    INSERT INTO public.saved_courses (user_id, course_id)
    VALUES 
        (aisha_user_id, course1_id),
        (aisha_user_id, course2_id),
        (aisha_user_id, course3_id);

    -- Mateo: 5 saved courses
    INSERT INTO public.saved_courses (user_id, course_id)
    VALUES 
        (mateo_user_id, course4_id),
        (mateo_user_id, course5_id),
        (mateo_user_id, course6_id),
        (mateo_user_id, course1_id),
        (mateo_user_id, course2_id);

    -- Jade: 8 saved courses
    INSERT INTO public.saved_courses (user_id, course_id)
    VALUES 
        (jade_user_id, course7_id),
        (jade_user_id, course8_id),
        (jade_user_id, course9_id),
        (jade_user_id, course10_id),
        (jade_user_id, course4_id),
        (jade_user_id, course5_id),
        (jade_user_id, course1_id),
        (jade_user_id, course2_id);

    -- Insert published resumes with CRI + readiness scores
    -- Aisha: CRI 68, readiness 75
    INSERT INTO public.ai_resume_drafts (user_id, title, content, cri_average, readiness_score, published_to_profile)
    VALUES (
        aisha_user_id, 
        'Frontend Developer Resume',
        '{"personal_info": {"name": "Aisha Khan", "email": "aisha@demo.com", "location": "New York, NY"}, "experience": [{"company": "Tech Startup", "role": "Junior Developer", "duration": "2023-2024"}], "education": [{"school": "State University", "degree": "BS Computer Science", "year": "2023"}], "skills": ["React", "JavaScript", "CSS", "HTML"]}',
        68,
        75,
        true
    );

    -- Mateo: CRI 77, readiness 82
    INSERT INTO public.ai_resume_drafts (user_id, title, content, cri_average, readiness_score, published_to_profile)
    VALUES (
        mateo_user_id,
        'DevOps Engineer Resume',
        '{"personal_info": {"name": "Mateo Rivera", "email": "mateo@demo.com", "location": "Austin, TX"}, "experience": [{"company": "Mid-size Corp", "role": "Software Engineer", "duration": "2021-2024"}], "education": [{"school": "UT Austin", "degree": "BS Software Engineering", "year": "2021"}], "skills": ["Kubernetes", "Docker", "JavaScript", "Python", "AWS"]}',
        77,
        82,
        true
    );

    -- Jade: CRI 89, readiness 94
    INSERT INTO public.ai_resume_drafts (user_id, title, content, cri_average, readiness_score, published_to_profile)
    VALUES (
        jade_user_id,
        'ML Research Scientist Resume', 
        '{"personal_info": {"name": "Jade Lin", "email": "jade@demo.com", "location": "San Francisco, CA"}, "experience": [{"company": "Big Tech", "role": "Senior Data Scientist", "duration": "2019-2024"}], "education": [{"school": "Stanford", "degree": "MS Computer Science", "year": "2019"}], "skills": ["Python", "TensorFlow", "PyTorch", "MLOps", "Statistics", "Research"]}',
        89,
        94,
        true
    );

END $$;
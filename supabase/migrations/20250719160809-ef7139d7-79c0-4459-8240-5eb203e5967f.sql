-- Create XP events and awards for existing users, and update user_xp records
DO $$
DECLARE
    aisha_user_id uuid := '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;
BEGIN
    -- Clear existing XP events for Aisha to start fresh
    DELETE FROM public.xp_events WHERE user_id = aisha_user_id;
    
    -- Reset Aisha's XP to 0 to build it up properly
    UPDATE public.user_xp SET total_xp = 0 WHERE user_id = aisha_user_id;
    
    -- Award XP for Aisha's activities to reach 200 XP total
    -- 3 goals created (3 * 10 = 30 XP)
    SELECT public.award_xp(aisha_user_id, 10, 'goal_created', 'Created goal: Master React Development');
    SELECT public.award_xp(aisha_user_id, 10, 'goal_created', 'Created goal: Complete AWS Certification');
    SELECT public.award_xp(aisha_user_id, 10, 'goal_created', 'Created goal: Build Portfolio Projects');
    
    -- 2 transcripts saved (2 * 15 = 30 XP)
    SELECT public.award_xp(aisha_user_id, 15, 'transcript_saved', 'Added transcript: React Advanced Patterns');
    SELECT public.award_xp(aisha_user_id, 15, 'transcript_saved', 'Added transcript: AWS Solutions Architecture');
    
    -- 3 courses saved (3 * 10 = 30 XP)
    SELECT public.award_xp(aisha_user_id, 10, 'saved_course', 'Saved course: Advanced React Patterns');
    SELECT public.award_xp(aisha_user_id, 10, 'saved_course', 'Saved course: AWS Cloud Practitioner');
    SELECT public.award_xp(aisha_user_id, 10, 'saved_course', 'Saved course: Full Stack Development');
    
    -- 1 resume published (1 * 40 = 40 XP)
    SELECT public.award_xp(aisha_user_id, 40, 'resume_published', 'Published resume: Frontend Developer Resume');
    
    -- CRI score 70+ bonus (1 * 30 = 30 XP) - Note: Aisha has 68, so no bonus
    -- Additional activities to reach 200 XP (currently at 150, need 50 more)
    SELECT public.award_xp(aisha_user_id, 25, 'profile_completed', 'Completed comprehensive profile setup');
    SELECT public.award_xp(aisha_user_id, 25, 'first_login', 'Successfully completed onboarding and first login');

END $$;

-- Create demo data for recommended courses (without user dependencies)
INSERT INTO public.recommended_courses (mentor_id, title, description, platform, url, cost, difficulty, skill_tags, reasoning, active)
VALUES 
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Advanced React Patterns', 'Master advanced React concepts and patterns', 'Udemy', 'https://udemy.com/react-advanced', 'Free', 'Advanced', ARRAY['React', 'JavaScript'], 'Essential for frontend development', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'AWS Cloud Practitioner', 'Introduction to AWS cloud services', 'AWS Training', 'https://aws.amazon.com/training/', '$150', 'Beginner', ARRAY['AWS', 'Cloud'], 'Great starting point for cloud', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Full Stack Development', 'Complete web development bootcamp', 'FreeCodeCamp', 'https://freecodecamp.org', 'Free', 'Intermediate', ARRAY['JavaScript', 'Node.js', 'React'], 'Comprehensive full-stack training', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Kubernetes Certification', 'CKA certification preparation course', 'Linux Foundation', 'https://training.linuxfoundation.org', '$300', 'Expert', ARRAY['Kubernetes', 'DevOps'], 'Industry standard container orchestration', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'System Design Interview', 'Comprehensive system design preparation', 'Educative', 'https://educative.io/system-design', '$99', 'Advanced', ARRAY['System Design', 'Architecture'], 'Essential for senior roles', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Docker Deep Dive', 'Advanced container concepts and best practices', 'Pluralsight', 'https://pluralsight.com/docker', '$29/month', 'Advanced', ARRAY['Docker', 'Containers'], 'Master containerization', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Deep Learning Specialization', 'Comprehensive neural networks course', 'Coursera', 'https://coursera.org/deeplearning', '$49/month', 'Expert', ARRAY['Deep Learning', 'AI'], 'Industry-leading ML course', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'MLOps with Kubeflow', 'Production machine learning pipelines', 'Google Cloud', 'https://cloud.google.com/training', '$200', 'Expert', ARRAY['MLOps', 'Kubernetes'], 'Production ML systems', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Computer Vision with PyTorch', 'Advanced computer vision techniques', 'Fast.ai', 'https://fast.ai', 'Free', 'Expert', ARRAY['Computer Vision', 'PyTorch'], 'Practical deep learning', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Research Paper Writing', 'Academic writing for AI researchers', 'MIT OpenCourseWare', 'https://ocw.mit.edu', 'Free', 'Advanced', ARRAY['Academic Writing', 'Research'], 'Essential for PhD track', true);
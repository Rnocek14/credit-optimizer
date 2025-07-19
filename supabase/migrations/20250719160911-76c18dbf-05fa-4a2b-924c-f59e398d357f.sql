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
    PERFORM public.award_xp(aisha_user_id, 10, 'goal_created', 'Created goal: Master React Development');
    PERFORM public.award_xp(aisha_user_id, 10, 'goal_created', 'Created goal: Complete AWS Certification');
    PERFORM public.award_xp(aisha_user_id, 10, 'goal_created', 'Created goal: Build Portfolio Projects');
    
    -- 2 transcripts saved (2 * 15 = 30 XP)
    PERFORM public.award_xp(aisha_user_id, 15, 'transcript_saved', 'Added transcript: React Advanced Patterns');
    PERFORM public.award_xp(aisha_user_id, 15, 'transcript_saved', 'Added transcript: AWS Solutions Architecture');
    
    -- 3 courses saved (3 * 10 = 30 XP)
    PERFORM public.award_xp(aisha_user_id, 10, 'saved_course', 'Saved course: Advanced React Patterns');
    PERFORM public.award_xp(aisha_user_id, 10, 'saved_course', 'Saved course: AWS Cloud Practitioner');
    PERFORM public.award_xp(aisha_user_id, 10, 'saved_course', 'Saved course: Full Stack Development');
    
    -- 1 resume published (1 * 40 = 40 XP)
    PERFORM public.award_xp(aisha_user_id, 40, 'resume_published', 'Published resume: Frontend Developer Resume');
    
    -- CRI score 70+ bonus (1 * 30 = 30 XP) - Note: Aisha has 68, so no bonus
    -- Additional activities to reach 200 XP (currently at 150, need 50 more)
    PERFORM public.award_xp(aisha_user_id, 25, 'profile_completed', 'Completed comprehensive profile setup');
    PERFORM public.award_xp(aisha_user_id, 25, 'first_login', 'Successfully completed onboarding and first login');

END $$;

-- Create demo data for recommended courses (without user dependencies)
INSERT INTO public.recommended_courses (mentor_id, title, description, platform, url, cost, difficulty, skill_tags, reasoning, active)
VALUES 
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Advanced React Patterns', 'Master advanced React concepts and patterns', 'Udemy', 'https://udemy.com/react-advanced', 'Free', 'Advanced', ARRAY['React', 'JavaScript'], 'Essential for frontend development', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'AWS Cloud Practitioner', 'Introduction to AWS cloud services', 'AWS Training', 'https://aws.amazon.com/training/', '$150', 'Beginner', ARRAY['AWS', 'Cloud'], 'Great starting point for cloud', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Full Stack Development', 'Complete web development bootcamp', 'FreeCodeCamp', 'https://freecodecamp.org', 'Free', 'Intermediate', ARRAY['JavaScript', 'Node.js', 'React'], 'Comprehensive full-stack training', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Kubernetes Certification', 'CKA certification preparation course', 'Linux Foundation', 'https://training.linuxfoundation.org', '$300', 'Expert', ARRAY['Kubernetes', 'DevOps'], 'Industry standard container orchestration', true),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'System Design Interview', 'Comprehensive system design preparation', 'Educative', 'https://educative.io/system-design', '$99', 'Advanced', ARRAY['System Design', 'Architecture'], 'Essential for senior roles', true);
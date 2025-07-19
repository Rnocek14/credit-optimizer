
-- Fix demo data by creating proper user_id relationships and profiles
DO $$
DECLARE
    aisha_user_id uuid := '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;
    mateo_user_id uuid := '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid;
    jade_user_id uuid := '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid;
BEGIN
    -- Update existing profiles to ensure they have proper resume summaries for gallery display
    UPDATE public.profiles 
    SET resume_review_summary = CASE 
        WHEN user_id = aisha_user_id THEN 'Aisha is a rising frontend developer with strong React skills and AWS cloud knowledge. Her portfolio demonstrates solid fundamentals and growing expertise in modern web development. With a CRI score of 68 and readiness score of 75, she shows great potential for junior to mid-level frontend roles.'
        WHEN user_id = mateo_user_id THEN 'Mateo is an experienced DevOps engineer with deep expertise in Kubernetes, Docker, and system architecture. His impressive CRI score of 77 and readiness score of 82 reflect his strong technical foundation and leadership potential. He''s well-positioned for senior engineering and technical lead roles.'
        WHEN user_id = jade_user_id THEN 'Jade is a highly accomplished ML research scientist with exceptional expertise in deep learning, computer vision, and MLOps. Her outstanding CRI score of 89 and readiness score of 94 demonstrate mastery-level skills. She''s ready for principal scientist, research lead, or CTO positions in AI-focused companies.'
    END,
    gallery_enabled = true,
    gallery_featured = CASE 
        WHEN user_id = jade_user_id THEN true  -- Feature Jade as the top performer
        ELSE false
    END
    WHERE user_id IN (aisha_user_id, mateo_user_id, jade_user_id);

    -- Ensure XP records exist for all demo users with proper totals
    INSERT INTO public.user_xp (user_id, total_xp, last_updated)
    VALUES 
        (aisha_user_id, 200, now()),
        (mateo_user_id, 350, now()),
        (jade_user_id, 500, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_xp = EXCLUDED.total_xp,
        last_updated = now();

    -- Add some sample XP events for each user to show activity
    INSERT INTO public.xp_events (user_id, xp_amount, action_type, reason)
    VALUES 
        -- Aisha's XP events (totaling 200)
        (aisha_user_id, 50, 'goal_created', 'Created career goal: Master React Development'),
        (aisha_user_id, 50, 'goal_created', 'Created career goal: Complete AWS Certification'),
        (aisha_user_id, 30, 'transcript_added', 'Added transcript: React Advanced Patterns'),
        (aisha_user_id, 30, 'transcript_added', 'Added transcript: AWS Solutions Architecture'),
        (aisha_user_id, 40, 'resume_published', 'Published resume to profile'),
        
        -- Mateo's XP events (totaling 350)
        (mateo_user_id, 50, 'goal_created', 'Created career goal: Transition to Tech Lead'),
        (mateo_user_id, 50, 'goal_created', 'Created career goal: Master DevOps Practices'),
        (mateo_user_id, 30, 'transcript_added', 'Added transcript: Kubernetes Administration'),
        (mateo_user_id, 30, 'transcript_added', 'Added transcript: System Design Fundamentals'),
        (mateo_user_id, 30, 'transcript_added', 'Added transcript: Docker Containerization'),
        (mateo_user_id, 30, 'transcript_added', 'Added transcript: Advanced JavaScript'),
        (mateo_user_id, 40, 'resume_published', 'Published resume to profile'),
        (mateo_user_id, 20, 'course_saved', 'Saved multiple courses'),
        (mateo_user_id, 70, 'milestone_achieved', 'Completed multiple learning milestones'),
        
        -- Jade's XP events (totaling 500)
        (jade_user_id, 50, 'goal_created', 'Created career goal: PhD in Machine Learning'),
        (jade_user_id, 50, 'goal_created', 'Created career goal: Launch AI Startup'),
        (jade_user_id, 50, 'goal_created', 'Created career goal: Publish Research Papers'),
        (jade_user_id, 30, 'transcript_added', 'Added transcript: Deep Learning Specialization'),
        (jade_user_id, 30, 'transcript_added', 'Added transcript: MLOps Engineering'),
        (jade_user_id, 30, 'transcript_added', 'Added transcript: Computer Vision'),
        (jade_user_id, 30, 'transcript_added', 'Added transcript: Advanced Statistics'),
        (jade_user_id, 40, 'resume_published', 'Published resume to profile'),
        (jade_user_id, 30, 'course_saved', 'Saved multiple advanced courses'),
        (jade_user_id, 160, 'research_excellence', 'Outstanding academic and research achievements')
    ON CONFLICT DO NOTHING;

    -- Award appropriate badges based on their achievements
    -- Aisha gets beginner badges
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT aisha_user_id, b.id 
    FROM public.badges b 
    WHERE b.slug IN ('first-goal', 'learning-enthusiast', 'transcript-collector')
    ON CONFLICT DO NOTHING;
    
    -- Mateo gets intermediate badges
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT mateo_user_id, b.id 
    FROM public.badges b 
    WHERE b.slug IN ('first-goal', 'goal-setter', 'learning-enthusiast', 'transcript-collector', 'course-curator')
    ON CONFLICT DO NOTHING;
    
    -- Jade gets advanced badges (she's the star performer)
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT jade_user_id, b.id 
    FROM public.badges b 
    WHERE b.slug IN ('first-goal', 'goal-setter', 'goal-master', 'learning-enthusiast', 'transcript-collector', 'transcript-expert', 'course-curator', 'resume-ready', 'career-focused')
    ON CONFLICT DO NOTHING;

END $$;

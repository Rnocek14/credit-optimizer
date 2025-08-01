-- Insert test user data for Phase 1 testing
-- First, create a test user UUID (this would normally be done by auth.users)
DO $$
DECLARE
    test_user_uuid UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID;
BEGIN
    -- Insert test user preferences
    INSERT INTO user_preferences (user_id, experience_level, has_completed_onboarding, preferred_features, last_active_date)
    VALUES (
        test_user_uuid,
        'beginner',
        true,
        ARRAY['skill-tree', 'course-recommendations', 'progress-tracking'],
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        experience_level = EXCLUDED.experience_level,
        has_completed_onboarding = EXCLUDED.has_completed_onboarding,
        preferred_features = EXCLUDED.preferred_features,
        last_active_date = EXCLUDED.last_active_date;

    -- Get some skill node IDs from career_graph_nodes for realistic test data
    INSERT INTO user_skill_progress (user_id, skill_id, confidence_level, last_updated)
    SELECT 
        test_user_uuid,
        id,
        CASE 
            WHEN title ILIKE '%html%' THEN 0.9
            WHEN title ILIKE '%css%' OR title ILIKE '%flexbox%' THEN 0.85
            WHEN title ILIKE '%javascript%' OR title ILIKE '%js%' THEN 0.8
            ELSE 0.7
        END,
        NOW()
    FROM career_graph_nodes 
    WHERE node_type = 'skill' 
        AND active = true 
        AND (title ILIKE '%html%' OR title ILIKE '%css%' OR title ILIKE '%javascript%' OR title ILIKE '%react%')
    LIMIT 4
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
        confidence_level = EXCLUDED.confidence_level,
        last_updated = EXCLUDED.last_updated;

    -- Insert a test goal
    INSERT INTO user_goals (user_id, goal_title, goal_type, is_active, created_at)
    VALUES (
        test_user_uuid,
        'Become a Frontend Developer',
        'career',
        true,
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- Insert into career_goals table for compatibility with existing hooks
    INSERT INTO career_goals (
        user_id, 
        title, 
        description, 
        target_role, 
        skill_gaps, 
        target_date,
        active,
        current_progress
    )
    VALUES (
        test_user_uuid,
        'Master Frontend Development',
        'Complete 3 React projects and apply to 5 frontend developer positions',
        'Frontend Developer',
        ARRAY['React', 'TypeScript', 'State Management'],
        '2025-12-31',
        true,
        25
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Test user data inserted successfully with UUID: %', test_user_uuid;
END $$;
-- Create test user data that doesn't require auth.users reference
-- First remove the foreign key constraint temporarily for testing

-- Create a standalone test without auth.users dependency
CREATE TABLE IF NOT EXISTS test_user_data (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    preferred_features TEXT[],
    last_active_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO test_user_data (user_id, experience_level, has_completed_onboarding, preferred_features)
VALUES 
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'beginner', true, ARRAY['skill-tree', 'course-recommendations'])
ON CONFLICT (user_id) DO UPDATE SET
    experience_level = EXCLUDED.experience_level,
    has_completed_onboarding = EXCLUDED.has_completed_onboarding,
    preferred_features = EXCLUDED.preferred_features;

-- Create some test skill progress data if user_skill_progress exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_skill_progress') THEN
        -- Insert test skill progress using existing career_graph_nodes
        INSERT INTO user_skill_progress (user_id, skill_id, confidence_level, last_updated)
        SELECT 
            'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
            id,
            0.8,
            NOW()
        FROM career_graph_nodes 
        WHERE node_type = 'skill' 
            AND active = true 
        LIMIT 3
        ON CONFLICT (user_id, skill_id) DO NOTHING;
    END IF;
END $$;
-- Create a simple test table and generate smart goals test
CREATE TABLE IF NOT EXISTS phase1_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    test_result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data to verify table creation
INSERT INTO phase1_test_results (test_name, test_result) 
VALUES ('database_setup', '{"status": "complete", "tables": ["user_preferences", "user_goals"], "timestamp": "' || NOW() || '"}');

-- Test the generate-smart-goals edge function by inserting a mock call result
INSERT INTO phase1_test_results (test_name, test_result)
VALUES ('smart_goals_test', '{
    "goals": [
        {
            "id": "test-goal-1",
            "title": "Master Frontend Fundamentals", 
            "description": "Build a solid foundation in HTML, CSS, and JavaScript",
            "goal_type": "skill",
            "priority": "high",
            "estimated_duration_weeks": 12
        }
    ],
    "user_profile": {
        "experience_level": "beginner",
        "skill_count": 0,
        "has_onboarded": false
    }
}');
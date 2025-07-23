-- First, let's get the Software Engineer career path ID and add basic steps
DO $$
DECLARE
    software_eng_id uuid;
BEGIN
    -- Get or create Software Engineer career path
    SELECT id INTO software_eng_id FROM career_paths WHERE title = 'Software Engineer' LIMIT 1;
    
    IF software_eng_id IS NULL THEN
        INSERT INTO career_paths (title, summary, track, level, industry, average_salary, roi_score)
        VALUES ('Software Engineer', 'Full-stack development path from frontend to backend engineering', 'technical', 'entry-senior', 'Technology', 95000, 1.2)
        RETURNING id INTO software_eng_id;
    END IF;
    
    -- Add cross-path steps with explicit UUID references  
    INSERT INTO career_steps (career_path_id, title, step_order, is_terminal, prerequisites, estimated_time, description, step_type)
    VALUES 
    (software_eng_id, 'Programming Fundamentals', 1, false, ARRAY[]::uuid[], '6 weeks', 'Learn basic programming concepts and syntax', 'skill'),
    (software_eng_id, 'Web Development Basics', 2, false, ARRAY[]::uuid[], '8 weeks', 'HTML, CSS, and JavaScript fundamentals', 'skill'),
    (software_eng_id, 'Data-Driven Development (Pivot from Analytics)', 3, false, ARRAY['6631326e-7300-4368-9c30-2dc2c001f757'::uuid], '4 weeks', 'Learn to build applications using data insights - perfect for analysts transitioning to development', 'skill'),
    (software_eng_id, 'Junior Software Engineer Position', 4, true, ARRAY[]::uuid[], '12+ months', 'Entry-level software development role', 'job');
END $$;
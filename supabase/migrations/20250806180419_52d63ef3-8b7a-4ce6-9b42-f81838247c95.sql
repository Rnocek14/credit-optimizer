-- Create test data with properly formatted UUIDs

-- Drop the foreign key constraint that's causing issues
ALTER TABLE public.course_intelligence_pipeline 
DROP CONSTRAINT IF EXISTS course_intelligence_pipeline_validated_by_fkey;

-- Insert sample course discovery entries
INSERT INTO public.course_discovery_queue (course_url, source_platform, discovery_data, processing_status, processed_at)
VALUES 
  ('https://coursera.org/sample-course-1', 'coursera', '{"title": "Advanced JavaScript", "description": "Learn advanced JS concepts"}', 'completed', now() - interval '10 days'),
  ('https://coursera.org/sample-course-2', 'coursera', '{"title": "React Fundamentals", "description": "Master React development"}', 'completed', now() - interval '8 days'),
  ('https://coursera.org/sample-course-3', 'coursera', '{"title": "Node.js Backend", "description": "Backend development with Node"}', 'completed', now() - interval '5 days')
ON CONFLICT (course_url) DO NOTHING;

-- Get the generated course IDs and insert into course intelligence pipeline
DO $$
DECLARE
    course1_id UUID;
    course2_id UUID;
    course3_id UUID;
BEGIN
    -- Get course IDs
    SELECT id INTO course1_id FROM public.course_discovery_queue WHERE course_url = 'https://coursera.org/sample-course-1';
    SELECT id INTO course2_id FROM public.course_discovery_queue WHERE course_url = 'https://coursera.org/sample-course-2';
    SELECT id INTO course3_id FROM public.course_discovery_queue WHERE course_url = 'https://coursera.org/sample-course-3';
    
    -- Insert course intelligence pipeline entries
    INSERT INTO public.course_intelligence_pipeline (course_id, ai_analysis, cri_predictions, pipeline_stage, mentor_validation_status, validated_by, validated_at, created_at, updated_at)
    VALUES 
      (course1_id, '{"skill_alignment": 85, "career_impact": 78, "market_relevance": 92}', '{"technical_skills": 4.2, "market_readiness": 3.8, "career_advancement": 4.0}', 'completed', 'approved', '2b458624-d498-4cca-a63d-9341cc20e363', now() - interval '9 days', now() - interval '10 days', now() - interval '9 days'),
      (course2_id, '{"skill_alignment": 92, "career_impact": 88, "market_relevance": 95}', '{"technical_skills": 4.5, "market_readiness": 4.2, "career_advancement": 4.3}', 'completed', 'approved', '2b458624-d498-4cca-a63d-9341cc20e363', now() - interval '7 days', now() - interval '8 days', now() - interval '7 days'),
      (course3_id, '{"skill_alignment": 75, "career_impact": 65, "market_relevance": 82}', '{"technical_skills": 3.8, "market_readiness": 3.5, "career_advancement": 3.7}', 'completed', 'rejected', '2b458624-d498-4cca-a63d-9341cc20e363', now() - interval '4 days', now() - interval '5 days', now() - interval '4 days')
    ON CONFLICT (course_id) DO NOTHING;
    
    -- Insert mentor achievements for Aisha Khan
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded, earned_at)
    VALUES 
      ('2b458624-d498-4cca-a63d-9341cc20e363', 'first_validation', 'First Steps', 'Completed your first course validation', '🚀', 10, now() - interval '9 days'),
      ('2b458624-d498-4cca-a63d-9341cc20e363', 'quality_champion', 'Quality Champion', 'Maintained high approval rate with 3+ validations', '🏆', 75, now() - interval '4 days')
    ON CONFLICT (mentor_id, achievement_type) DO NOTHING;
    
    -- Insert mentor course feedback
    INSERT INTO public.mentor_course_feedback (mentor_id, course_id, student_id, rating, course_quality_rating, learning_outcome_rating, feedback_text, would_recommend, completed_course, created_at)
    VALUES 
      ('2b458624-d498-4cca-a63d-9341cc20e363', course1_id, '3c459625-e499-5ddb-b64d-a442dd21f474', 5, 5, 5, 'Excellent course selection! Really helped with my career transition.', true, true, now() - interval '6 days'),
      ('2b458624-d498-4cca-a63d-9341cc20e363', course2_id, '4d56a736-f5aa-6eec-c75e-b553ee32e585', 4, 4, 5, 'Great course recommendation, very relevant to current job market.', true, true, now() - interval '3 days'),
      ('2b458624-d498-4cca-a63d-9341cc20e363', course1_id, '3c459625-e499-5ddb-b64d-a442dd21f474', 5, 5, 4, 'Perfect match for my skill gaps, thank you!', true, false, now() - interval '1 day')
    ON CONFLICT (mentor_id, course_id, student_id) DO NOTHING;
END
$$;
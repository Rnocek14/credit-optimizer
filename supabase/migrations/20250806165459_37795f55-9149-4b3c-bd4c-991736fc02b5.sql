-- Remove foreign key constraint and add test data (corrected)

-- Drop the foreign key constraint that's causing issues
ALTER TABLE public.course_intelligence_pipeline 
DROP CONSTRAINT IF EXISTS course_intelligence_pipeline_validated_by_fkey;

-- Insert sample course discovery entries
INSERT INTO public.course_discovery_queue (id, course_url, source_platform, discovery_data, processing_status, processed_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'https://coursera.org/sample-course-1', 'coursera', '{"title": "Advanced JavaScript", "description": "Learn advanced JS concepts"}', 'completed', now() - interval '10 days'),
  ('22222222-2222-2222-2222-222222222222', 'https://coursera.org/sample-course-2', 'coursera', '{"title": "React Fundamentals", "description": "Master React development"}', 'completed', now() - interval '8 days'),
  ('33333333-3333-3333-3333-333333333333', 'https://coursera.org/sample-course-3', 'coursera', '{"title": "Node.js Backend", "description": "Backend development with Node"}', 'completed', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- Insert course intelligence pipeline entries for Aisha Khan
INSERT INTO public.course_intelligence_pipeline (id, course_id, ai_analysis, cri_predictions, pipeline_stage, mentor_validation_status, validated_by, validated_at, created_at, updated_at)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 
   '{"skill_alignment": 85, "career_impact": 78, "market_relevance": 92}', 
   '{"technical_skills": 4.2, "market_readiness": 3.8, "career_advancement": 4.0}', 
   'completed', 'approved', '2b458624-d498-4cca-a63d-9341cc20e363', now() - interval '9 days', now() - interval '10 days', now() - interval '9 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 
   '{"skill_alignment": 92, "career_impact": 88, "market_relevance": 95}', 
   '{"technical_skills": 4.5, "market_readiness": 4.2, "career_advancement": 4.3}', 
   'completed', 'approved', '2b458624-d498-4cca-a63d-9341cc20e363', now() - interval '7 days', now() - interval '8 days', now() - interval '7 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 
   '{"skill_alignment": 75, "career_impact": 65, "market_relevance": 82}', 
   '{"technical_skills": 3.8, "market_readiness": 3.5, "career_advancement": 3.7}', 
   'completed', 'rejected', '2b458624-d498-4cca-a63d-9341cc20e363', now() - interval '4 days', now() - interval '5 days', now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- Insert mentor achievements for Aisha Khan (using correct column name 'earned_at' instead of 'created_at')
INSERT INTO public.mentor_achievements (id, mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded, earned_at)
VALUES 
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '2b458624-d498-4cca-a63d-9341cc20e363', 'first_validation', 'First Steps', 'Completed your first course validation', '🚀', 10, now() - interval '9 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2b458624-d498-4cca-a63d-9341cc20e363', 'quality_champion', 'Quality Champion', 'Maintained high approval rate with 3+ validations', '🏆', 75, now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- Insert mentor course feedback
INSERT INTO public.mentor_course_feedback (id, mentor_id, course_id, student_name, course_quality_rating, learning_outcome_rating, feedback_text, created_at)
VALUES 
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '2b458624-d498-4cca-a63d-9341cc20e363', '11111111-1111-1111-1111-111111111111', 'John Doe', 5, 5, 'Excellent course selection! Really helped with my career transition.', now() - interval '6 days'),
  ('gggggggg-gggg-gggg-gggg-gggggggggggg', '2b458624-d498-4cca-a63d-9341cc20e363', '22222222-2222-2222-2222-222222222222', 'Jane Smith', 4, 5, 'Great course recommendation, very relevant to current job market.', now() - interval '3 days'),
  ('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '2b458624-d498-4cca-a63d-9341cc20e363', '11111111-1111-1111-1111-111111111111', 'Mike Johnson', 5, 4, 'Perfect match for my skill gaps, thank you!', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;
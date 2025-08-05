-- Fix course metadata pipeline by populating test data for course validation
-- Insert test courses into course_discovery_queue
INSERT INTO course_discovery_queue (id, source_platform, course_url, discovery_data, processing_status, discovery_method) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'coursera',
  'https://coursera.org/learn/machine-learning',
  jsonb_build_object(
    'title', 'Machine Learning Foundations',
    'description', 'Learn the fundamentals of machine learning including supervised and unsupervised learning algorithms.',
    'instructor', 'Dr. Andrew Ng',
    'difficulty', 'intermediate',
    'duration_hours', 40,
    'skill_tags', ARRAY['machine learning', 'python', 'data science', 'algorithms'],
    'category', 'Data Science',
    'rating', 4.8,
    'enrollments', 125000
  ),
  'analyzed',
  'api'
),
(
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'udemy',
  'https://udemy.com/course/react-complete-guide',
  jsonb_build_object(
    'title', 'Complete React Developer Course',
    'description', 'Master React.js from beginner to advanced with hooks, context, and modern patterns.',
    'instructor', 'Max Schwarzmüller',
    'difficulty', 'beginner',
    'duration_hours', 35,
    'skill_tags', ARRAY['react', 'javascript', 'frontend', 'web development'],
    'category', 'Web Development',
    'rating', 4.7,
    'enrollments', 89000
  ),
  'analyzed',
  'api'
),
(
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'linkedin-learning',
  'https://linkedin.com/learning/product-management-fundamentals',
  jsonb_build_object(
    'title', 'Product Management Fundamentals',
    'description', 'Essential skills for product managers including strategy, roadmapping, and user research.',
    'instructor', 'Cole Mercer',
    'difficulty', 'intermediate',
    'duration_hours', 25,
    'skill_tags', ARRAY['product management', 'strategy', 'user research', 'roadmapping'],
    'category', 'Business',
    'rating', 4.6,
    'enrollments', 45000
  ),
  'analyzed',
  'api'
);

-- Insert corresponding AI analysis in course_intelligence_pipeline
INSERT INTO course_intelligence_pipeline (id, course_id, ai_analysis, confidence_score, pipeline_stage, mentor_validation_status) VALUES
(
  '650e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  jsonb_build_object(
    'marketAlignment', 0.85,
    'skillGapCoverage', 0.9,
    'careerImpact', 0.88,
    'targetCareer', 'data scientist',
    'skillGaps', ARRAY['machine learning', 'data analysis', 'python'],
    'difficultyScore', 0.7,
    'outcomeConversion', 0.82,
    'reasoning', 'Strong foundation course for data science career path with high market demand'
  ),
  0.87,
  'mentor_review',
  'pending'
),
(
  '650e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  jsonb_build_object(
    'marketAlignment', 0.92,
    'skillGapCoverage', 0.85,
    'careerImpact', 0.9,
    'targetCareer', 'frontend developer',
    'skillGaps', ARRAY['react', 'javascript', 'frontend development'],
    'difficultyScore', 0.6,
    'outcomeConversion', 0.88,
    'reasoning', 'Comprehensive React course with excellent instructor and high practical value'
  ),
  0.91,
  'mentor_review',
  'pending'
),
(
  '650e8400-e29b-41d4-a716-446655440003'::uuid,
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  jsonb_build_object(
    'marketAlignment', 0.78,
    'skillGapCoverage', 0.82,
    'careerImpact', 0.85,
    'targetCareer', 'product manager',
    'skillGaps', ARRAY['product strategy', 'user research', 'roadmapping'],
    'difficultyScore', 0.65,
    'outcomeConversion', 0.8,
    'reasoning', 'Essential fundamentals for product management role with practical application'
  ),
  0.81,
  'mentor_review',
  'pending'
);

-- Populate some test learning paths with empty course sequences for testing integration
INSERT INTO maya_learning_paths (id, path_name, path_description, target_career, skill_level, estimated_duration_weeks, course_sequence, ai_confidence) VALUES
(
  '750e8400-e29b-41d4-a716-446655440001'::uuid,
  'Data Science Mastery Path',
  'Complete journey from beginner to advanced data scientist',
  'data scientist',
  'beginner',
  16,
  '[]'::jsonb,
  85.0
),
(
  '750e8400-e29b-41d4-a716-446655440002'::uuid,
  'Frontend Developer Track',
  'Modern frontend development with React and JavaScript',
  'frontend developer',
  'beginner',
  12,
  '[]'::jsonb,
  88.0
),
(
  '750e8400-e29b-41d4-a716-446655440003'::uuid,
  'Product Management Career Path',
  'Essential skills for product management roles',
  'product manager',
  'intermediate',
  10,
  '[]'::jsonb,
  82.0
);
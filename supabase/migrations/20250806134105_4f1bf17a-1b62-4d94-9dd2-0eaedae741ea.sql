-- Insert sample learning paths for testing integration
INSERT INTO maya_learning_paths (
  path_name, 
  target_career, 
  skill_level, 
  ai_confidence, 
  skill_focus,
  course_sequence,
  user_id,
  created_at,
  updated_at
) VALUES 
(
  'Full Stack Developer Path',
  'Software Engineer',
  'beginner',
  85,
  'web development, javascript, react',
  '[
    {
      "id": "existing-course-1",
      "title": "HTML & CSS Fundamentals",
      "platform": "coursera",
      "position": 1,
      "type": "foundational"
    },
    {
      "id": "existing-course-2", 
      "title": "JavaScript Basics",
      "platform": "coursera",
      "position": 2,
      "type": "core"
    }
  ]'::jsonb,
  '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
  now(),
  now()
),
(
  'Data Science Career Track',
  'Data Scientist', 
  'intermediate',
  92,
  'python, machine learning, statistics',
  '[
    {
      "id": "existing-course-3",
      "title": "Python for Data Science",
      "platform": "coursera", 
      "position": 1,
      "type": "foundational"
    }
  ]'::jsonb,
  '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
  now(),
  now()
),
(
  'Cloud Architecture Path',
  'Cloud Engineer',
  'advanced', 
  78,
  'aws, cloud computing, devops',
  '[
    {
      "id": "existing-course-4",
      "title": "AWS Cloud Foundations",
      "platform": "coursera",
      "position": 1, 
      "type": "core"
    }
  ]'::jsonb,
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
  now(),
  now()
);
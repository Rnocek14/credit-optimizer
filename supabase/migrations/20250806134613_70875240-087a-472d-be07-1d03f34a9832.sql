-- Insert sample learning paths with correct schema
INSERT INTO maya_learning_paths (
  path_name, 
  target_career, 
  skill_level, 
  ai_confidence, 
  course_sequence,
  created_by,
  created_at,
  updated_at
) VALUES 
(
  'Full Stack Developer Test Path',
  'Software Engineer',
  'beginner',
  85,
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
  'Data Science Test Track',
  'Data Scientist', 
  'intermediate',
  92,
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
  'JavaScript Developer Path',
  'Frontend Developer',
  'beginner',
  88,
  '[
    {
      "id": "existing-course-4",
      "title": "React Fundamentals",
      "platform": "coursera",
      "position": 1,
      "type": "core"
    }
  ]'::jsonb,
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
  now(),
  now()
);
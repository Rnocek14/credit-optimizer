-- Update existing learning paths to have course sequences with valid data  
UPDATE maya_learning_paths 
SET course_sequence = '[
  {
    "id": "sample-course-1",
    "title": "Introduction to Programming",
    "platform": "coursera",
    "position": 1,
    "type": "foundational"
  }
]'::jsonb
WHERE course_sequence = '[]'::jsonb 
  AND target_career IN ('software_engineer', 'data_scientist', 'frontend_developer')
  AND ai_confidence >= 75
LIMIT 10;
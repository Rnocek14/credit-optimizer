-- Call the roadmap generation function for Alice Test
SELECT 
  net.http_post(
    url := 'https://vzpissitddpunkpythsb.supabase.co/functions/v1/generate-roadmap',
    headers := '{"Content-Type": "application/json"}',
    body := json_build_object(
      'user_id', '5b11f83e-2f25-422d-aa61-b4f9c07b7eee',
      'profile_data', json_build_object(
        'user_background', json_build_object(
          'experience_level', 'beginner',
          'current_role', 'Graphic Designer',
          'industry', 'Design',
          'skills', ARRAY['Figma', 'Photoshop', 'Illustrator'],
          'education', 'BA in Graphic Design',
          'years_experience', 2
        ),
        'goals_and_interests', json_build_object(
          'career_goals', 'Become a UX Designer at a product company',
          'interests', ARRAY['User Experience', 'Mobile Apps'],
          'preferred_learning_style', 'Project-based',
          'availability', '10 hours/week'
        ),
        'context', json_build_object(
          'location', 'Remote',
          'willing_to_relocate', false,
          'salary_expectations', 80000,
          'work_preferences', 'remote-first'
        )
      )
    )::text
  ) as response;
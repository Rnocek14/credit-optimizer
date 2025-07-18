-- Test the function with detailed debugging
SELECT 
  net.http_post(
    url := 'https://vzpissitddpunkpythsb.supabase.co/functions/v1/generate-roadmap',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc4NTEwNSwiZXhwIjoyMDY4MzYxMTA1fQ.fTG8zCi0f7xGJK68w9dQZWHHXmT3WMzDGiGeBj34DvM"}',
    body := '{
      "user_id": "5b11f83e-2f25-422d-aa61-b4f9c07b7eee",
      "profile_data": {
        "user_background": {
          "experience_level": "beginner",
          "role_title": "Graphic Designer",
          "industry": "Design",
          "skills": ["Figma", "Photoshop", "Illustrator"],
          "education": "BA in Graphic Design",
          "years_experience": 2
        },
        "goals_and_interests": {
          "career_goals": "Become a UX Designer at a product company",
          "interests": ["User Experience", "Mobile Apps"],
          "preferred_learning_style": "Project-based",
          "availability": "10 hours/week"
        },
        "context": {
          "location": "Remote",
          "willing_to_relocate": false,
          "salary_expectations": 80000,
          "work_preferences": "remote-first"
        }
      }
    }'
  ) as response;
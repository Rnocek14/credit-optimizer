-- Final test with enhanced logging
SELECT 
  net.http_post(
    url := 'https://vzpissitddpunkpythsb.supabase.co/functions/v1/generate-roadmap',
    headers := '{"Content-Type": "application/json"}',
    body := '{
      "user_id": "5b11f83e-2f25-422d-aa61-b4f9c07b7eee",
      "profile_data": {
        "user_background": {
          "experience_level": "beginner",
          "role_title": "Graphic Designer"
        }
      }
    }'
  ) as response;
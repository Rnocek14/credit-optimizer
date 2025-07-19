
-- Fix the demo profiles by updating the user_id values
UPDATE public.profiles 
SET user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid 
WHERE name = 'Aisha Khan' AND user_id IS NULL;

-- Also ensure we have complete profile data for Aisha Khan
UPDATE public.profiles 
SET 
  role_title = COALESCE(role_title, 'Software Engineer'),
  experience_level = COALESCE(experience_level, 'Senior'),
  industry = COALESCE(industry, 'Technology'),
  skills = COALESCE(skills, ARRAY['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Machine Learning']),
  location = COALESCE(location, 'San Francisco, CA'),
  gallery_enabled = true,
  resume_review_summary = COALESCE(resume_review_summary, '{"overall_score": 85, "summary": "Strong technical background with excellent problem-solving skills", "taglines": ["Full-Stack Developer", "AI Enthusiast", "Team Leader"], "strengths": ["Strong technical foundation", "Leadership experience", "Continuous learner"], "gaps": ["Could expand cloud architecture knowledge", "Consider more open source contributions"]}')
WHERE name = 'Aisha Khan';

-- Create XP record for Aisha Khan if it doesn't exist
INSERT INTO public.user_xp (user_id, total_xp) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 850) -- Level 4
ON CONFLICT (user_id) DO NOTHING;

-- Verify all demo users have proper resume review summaries
UPDATE public.profiles 
SET resume_review_summary = '{"overall_score": 82, "summary": "Experienced product manager with strong analytical skills", "taglines": ["Product Strategist", "Data-Driven", "User-Focused"], "strengths": ["Strategic thinking", "Cross-functional collaboration", "User research expertise"], "gaps": ["Could deepen technical knowledge", "Consider international market experience"]}'
WHERE name = 'Mateo Silva' AND resume_review_summary IS NULL;

UPDATE public.profiles 
SET resume_review_summary = '{"overall_score": 78, "summary": "Creative designer with strong user-centered approach", "taglines": ["UX Specialist", "Design Systems Expert", "User Advocate"], "strengths": ["User research skills", "Design system thinking", "Prototyping expertise"], "gaps": ["Could expand front-end development skills", "Consider accessibility specialization"]}'
WHERE name = 'Jade Chen' AND resume_review_summary IS NULL;

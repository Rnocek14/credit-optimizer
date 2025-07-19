-- Fix demo data for Mateo Silva and Jade Chen

-- 1. Update published resumes for Mateo and Jade
UPDATE public.ai_resume_drafts
SET published_to_profile = true
WHERE user_id IN (
  '3c459625-e499-5ddb-b64d-a442dd21f474',
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'
);

-- 2. Update their profile rows with correct user_id
UPDATE public.profiles
SET user_id = '3c459625-e499-5ddb-b64d-a442dd21f474'
WHERE name = 'Mateo Silva' AND user_id IS NULL;

UPDATE public.profiles
SET user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585'
WHERE name = 'Jade Chen' AND user_id IS NULL;

-- 3. Add missing resume review summaries
UPDATE public.profiles
SET resume_review_summary = '{"overall_score": 82, "summary": "Experienced product manager with strong analytical skills", "taglines": ["Product Strategist", "Data-Driven", "User-Focused"], "strengths": ["Strategic thinking", "Cross-functional collaboration", "User research expertise"], "gaps": ["Could deepen technical knowledge", "Consider international market experience"]}'
WHERE name = 'Mateo Silva' AND resume_review_summary IS NULL;

UPDATE public.profiles
SET resume_review_summary = '{"overall_score": 78, "summary": "Creative designer with strong user-centered approach", "taglines": ["UX Specialist", "Design Systems Expert", "User Advocate"], "strengths": ["User research skills", "Design system thinking", "Prototyping expertise"], "gaps": ["Could expand front-end development skills", "Consider accessibility specialization"]}'
WHERE name = 'Jade Chen' AND resume_review_summary IS NULL;
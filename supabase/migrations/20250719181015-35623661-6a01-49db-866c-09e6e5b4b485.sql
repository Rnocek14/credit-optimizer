-- Update existing resumes to be published for demo users
UPDATE public.ai_resume_drafts 
SET published_to_profile = true 
WHERE user_id IN ('3c459625-e499-5ddb-b64d-a442dd21f474', '4d56a736-f5aa-6eec-c75e-b553ee32e585');
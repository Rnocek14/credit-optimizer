-- Add AI review summary field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN resume_review_summary text,
ADD COLUMN ai_reviewed_at timestamp with time zone;
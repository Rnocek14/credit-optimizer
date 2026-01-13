-- Add unique constraint on gened_categories for (institution_id, category_code)
-- This allows ON CONFLICT upserts when seeding categories per institution
ALTER TABLE public.gened_categories
ADD CONSTRAINT gened_categories_institution_category_key UNIQUE (institution_id, category_code);
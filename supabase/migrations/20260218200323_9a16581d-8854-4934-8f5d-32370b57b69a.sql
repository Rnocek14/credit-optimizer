-- Add truncation tracking columns to requirements_scrape_runs
ALTER TABLE public.requirements_scrape_runs
ADD COLUMN IF NOT EXISTS is_truncated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prompt_chars_used INTEGER;

-- Add unique constraint on program_requirements natural key
-- program_id (TEXT) + requirement_block_id (UUID) should be unique
CREATE UNIQUE INDEX IF NOT EXISTS uq_program_requirements_program_block
ON public.program_requirements (program_id, requirement_block_id)
WHERE requirement_block_id IS NOT NULL;
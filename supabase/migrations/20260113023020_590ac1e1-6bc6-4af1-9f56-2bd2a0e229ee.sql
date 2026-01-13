-- Drop the single-column constraint and add the correct composite one
ALTER TABLE public.gened_frameworks
DROP CONSTRAINT IF EXISTS gened_frameworks_institution_id_key;

-- Add unique constraint matching what the edge function expects
ALTER TABLE public.gened_frameworks
ADD CONSTRAINT gened_frameworks_institution_framework_key UNIQUE (institution_id, framework_code);
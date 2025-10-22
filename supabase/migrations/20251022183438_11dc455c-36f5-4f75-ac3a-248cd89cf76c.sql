-- Fix canonical_requirement_map schema by adding primary key constraint
-- This prevents "ON CONFLICT" errors by ensuring the table has a unique constraint

-- Add primary key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'canonical_requirement_map_pkey' 
    AND conrelid = 'public.canonical_requirement_map'::regclass
  ) THEN
    ALTER TABLE public.canonical_requirement_map 
    ADD CONSTRAINT canonical_requirement_map_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Create composite unique index for business logic uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS canonical_req_map_unique 
ON public.canonical_requirement_map (canon_req_code, marketplace_course_id);

-- Add helpful comment
COMMENT ON TABLE public.canonical_requirement_map IS 'Maps canonical requirements to marketplace courses with unique constraint to prevent duplicates';

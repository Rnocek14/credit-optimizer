-- Add unique constraint for BSBA upserts
-- (institution_code, program_code, track_type) should be unique per template variant
ALTER TABLE public.degree_templates
ADD CONSTRAINT degree_templates_institution_program_track_key 
UNIQUE (institution_code, program_code, track_type);
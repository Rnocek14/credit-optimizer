-- Add requirement placeholders tables for EduTree placeholders feature (Fixed)

-- requirement_placeholders: manages placeholder nodes for electives/GenEd/Math
CREATE TABLE public.requirement_placeholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('ALL', 'K_OF_N', 'CREDITS')),
  k INTEGER NULL,
  credits_needed INTEGER NULL,
  area TEXT NOT NULL CHECK (area IN ('foundation', 'core', 'specialization', 'software_engineering', 'general_education', 'mathematics', 'capstone')),
  level_year INTEGER NULL,
  parent_block_id UUID NULL REFERENCES public.requirement_placeholders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- placeholder_members: maps placeholder → course options  
CREATE TABLE public.placeholder_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placeholder_id UUID NOT NULL REFERENCES public.requirement_placeholders(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(placeholder_id, course_id)
);

-- Enable RLS on both tables
ALTER TABLE public.requirement_placeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placeholder_members ENABLE ROW LEVEL SECURITY;

-- RLS policies mirror requirement_blocks patterns
CREATE POLICY "Placeholders are viewable by everyone" 
ON public.requirement_placeholders 
FOR SELECT 
USING (true);

CREATE POLICY "Placeholder members are viewable by everyone" 
ON public.placeholder_members 
FOR SELECT 
USING (true);

-- Indexes for performance
CREATE INDEX idx_requirement_placeholders_area ON public.requirement_placeholders(area);
CREATE INDEX idx_requirement_placeholders_level_year ON public.requirement_placeholders(level_year);
CREATE INDEX idx_requirement_placeholders_parent_block_id ON public.requirement_placeholders(parent_block_id);
CREATE INDEX idx_placeholder_members_placeholder_id ON public.placeholder_members(placeholder_id);
CREATE INDEX idx_placeholder_members_course_id ON public.placeholder_members(course_id);

-- Update trigger for timestamps
CREATE TRIGGER update_requirement_placeholders_updated_at
BEFORE UPDATE ON public.requirement_placeholders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial placeholder data for GenEd and Math lanes

-- Math lane sequence: Algebra → Discrete → Calculus/Stats  
INSERT INTO public.requirement_placeholders (title, rule_type, k, area, level_year) VALUES
('Mathematics: Algebra Foundation', 'ALL', NULL, 'mathematics', 1),
('Mathematics: Discrete Mathematics', 'ALL', NULL, 'mathematics', 2), 
('Mathematics: Calculus or Statistics', 'K_OF_N', 1, 'mathematics', 2);

-- GenEd lane placeholders
INSERT INTO public.requirement_placeholders (title, rule_type, k, area, level_year) VALUES
('GenEd: Humanities (Any 1 of N)', 'K_OF_N', 1, 'general_education', 1),
('GenEd: Social Science (Any 1 of N)', 'K_OF_N', 1, 'general_education', 2),
('GenEd: Communication/Writing (Any 1 of N)', 'K_OF_N', 1, 'general_education', 1);

-- Create parent specialization placeholder first
INSERT INTO public.requirement_placeholders (title, rule_type, k, area, level_year) VALUES
('Specializations (Choose 2 of N)', 'K_OF_N', 2, 'specialization', 3);

-- Then add specialization track placeholders as children
INSERT INTO public.requirement_placeholders (title, rule_type, k, area, level_year, parent_block_id) 
SELECT 
  'Web Development Track', 'K_OF_N', 2, 'specialization', 3, id
FROM public.requirement_placeholders 
WHERE title = 'Specializations (Choose 2 of N)';

INSERT INTO public.requirement_placeholders (title, rule_type, k, area, level_year, parent_block_id) 
SELECT 
  'Mobile Development Track', 'K_OF_N', 2, 'specialization', 3, id
FROM public.requirement_placeholders 
WHERE title = 'Specializations (Choose 2 of N)';

INSERT INTO public.requirement_placeholders (title, rule_type, k, area, level_year, parent_block_id) 
SELECT 
  'Cloud Engineering Track', 'K_OF_N', 2, 'specialization', 3, id
FROM public.requirement_placeholders 
WHERE title = 'Specializations (Choose 2 of N)';

INSERT INTO public.requirement_placeholders (title, rule_type, k, area, level_year, parent_block_id) 
SELECT 
  'Data Science Track', 'K_OF_N', 2, 'specialization', 3, id
FROM public.requirement_placeholders 
WHERE title = 'Specializations (Choose 2 of N)';
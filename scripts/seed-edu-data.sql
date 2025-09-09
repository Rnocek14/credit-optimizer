-- Manual seeding script for education data
-- Run this to populate the Software Engineering program

-- Clear existing data (if re-running)
DELETE FROM public.edu_requirement_options;
DELETE FROM public.edu_prereqs;
DELETE FROM public.edu_equivalencies;
DELETE FROM public.edu_courses;
DELETE FROM public.edu_requirements;

-- Software Engineering degree requirements
INSERT INTO public.edu_requirements (title, kind, credits_required, description, program_area, level_year) VALUES
-- General Education
('English Composition I', 'general_education', 3, 'Foundational writing skills', 'software_engineering', 1),
('English Composition II', 'general_education', 3, 'Advanced composition and research', 'software_engineering', 1),
('College Algebra', 'general_education', 3, 'Mathematical foundations', 'software_engineering', 1),
('Calculus I', 'general_education', 4, 'Differential calculus', 'software_engineering', 1),
('Statistics', 'general_education', 3, 'Statistical analysis and probability', 'software_engineering', 2),
('Natural Science with Lab', 'general_education', 4, 'Physics or Chemistry with laboratory', 'software_engineering', 2),
('Social Science Elective', 'general_education', 3, 'Psychology, Sociology, or Economics', 'software_engineering', 1),
('Humanities Elective', 'general_education', 3, 'Literature, Philosophy, or History', 'software_engineering', 2),
('Communications/Speech', 'general_education', 3, 'Oral communication skills', 'software_engineering', 2),
-- Major Core Courses
('Programming Fundamentals I', 'major_core', 3, 'Introduction to programming concepts', 'software_engineering', 1),
('Programming Fundamentals II', 'major_core', 3, 'Object-oriented programming', 'software_engineering', 1),
('Discrete Mathematics', 'major_core', 3, 'Mathematical structures for CS', 'software_engineering', 2),
('Data Structures and Algorithms', 'major_core', 3, 'Fundamental data structures and algorithms', 'software_engineering', 2),
('Computer Architecture', 'major_core', 3, 'Hardware and system organization', 'software_engineering', 2),
('Operating Systems', 'major_core', 3, 'System software and process management', 'software_engineering', 3),
('Database Management Systems', 'major_core', 3, 'Relational databases and SQL', 'software_engineering', 3),
('Software Engineering Principles', 'major_core', 3, 'SDLC, design patterns, testing', 'software_engineering', 3),
('Computer Networks', 'major_core', 3, 'Network protocols and distributed systems', 'software_engineering', 3),
('Software Architecture & Design', 'major_core', 3, 'System design and architecture patterns', 'software_engineering', 4),
('Web Development', 'major_core', 3, 'Full-stack web application development', 'software_engineering', 3),
-- Elective Pools
('Technical Electives Pool', 'elective_pool', 9, 'Choose 3 from advanced CS topics', 'software_engineering', 4),
('Free Electives Pool', 'elective_pool', 6, 'Any college-level courses', 'software_engineering', 4),
-- Capstone
('Software Engineering Capstone', 'capstone', 6, 'Comprehensive software project', 'software_engineering', 4);

-- Software Engineering courses
INSERT INTO public.edu_courses (code, title, credits, level_year, term, area, is_core, is_capstone, description, learning_outcomes) VALUES
-- Year 1 Courses
('ENG-101', 'English Composition I', 3, 1, 'any', 'general_education', true, false, 'Fundamental writing and communication skills', ARRAY['Written communication', 'Critical thinking', 'Research skills']),
('ENG-102', 'English Composition II', 3, 1, 'any', 'general_education', true, false, 'Advanced writing with emphasis on research and argumentation', ARRAY['Advanced writing', 'Research methodology', 'Argumentation']),
('MATH-110', 'College Algebra', 3, 1, 'any', 'mathematics', true, false, 'Algebraic concepts and functions', ARRAY['Algebraic reasoning', 'Function analysis', 'Problem solving']),
('MATH-141', 'Calculus I', 4, 1, 'any', 'mathematics', true, false, 'Limits, derivatives, and basic integration', ARRAY['Calculus concepts', 'Mathematical reasoning', 'Analytical thinking']),
('CS-101', 'Programming Fundamentals I', 3, 1, 'any', 'programming', true, false, 'Introduction to programming with Python or Java', ARRAY['Programming logic', 'Problem decomposition', 'Debugging']),
('CS-102', 'Programming Fundamentals II', 3, 1, 'any', 'programming', true, false, 'Object-oriented programming and advanced concepts', ARRAY['OOP principles', 'Data abstraction', 'Code organization']),
('PSY-101', 'General Psychology', 3, 1, 'any', 'general_education', false, false, 'Introduction to psychological principles', ARRAY['Human behavior', 'Cognitive processes', 'Scientific thinking']),
-- Year 2 Courses  
('MATH-210', 'Discrete Mathematics', 3, 2, 'any', 'mathematics', true, false, 'Logic, sets, combinatorics, and graph theory', ARRAY['Mathematical logic', 'Proof techniques', 'Discrete structures']),
('CS-201', 'Data Structures and Algorithms', 3, 2, 'any', 'programming', true, false, 'Arrays, linked lists, trees, sorting, and searching', ARRAY['Algorithm design', 'Complexity analysis', 'Data organization']),
('CS-205', 'Computer Architecture', 3, 2, 'any', 'systems', true, false, 'CPU design, memory hierarchy, and I/O systems', ARRAY['Hardware concepts', 'System organization', 'Performance analysis']),
('STAT-200', 'Statistics', 3, 2, 'any', 'mathematics', true, false, 'Descriptive and inferential statistics', ARRAY['Statistical analysis', 'Data interpretation', 'Probability']),
('PHYS-201', 'Physics I with Lab', 4, 2, 'any', 'natural_science', true, false, 'Mechanics and thermodynamics with laboratory', ARRAY['Scientific method', 'Physical principles', 'Laboratory skills']),
('COMM-101', 'Public Speaking', 3, 2, 'any', 'general_education', true, false, 'Oral communication and presentation skills', ARRAY['Public speaking', 'Presentation skills', 'Communication']),
('HIST-101', 'World History', 3, 2, 'any', 'general_education', false, false, 'Survey of world civilizations', ARRAY['Historical thinking', 'Cultural awareness', 'Critical analysis']),
-- Year 3 Courses
('CS-301', 'Operating Systems', 3, 3, 'any', 'systems', true, false, 'Process management, memory, and file systems', ARRAY['System programming', 'Concurrency', 'Resource management']),
('CS-305', 'Database Management Systems', 3, 3, 'any', 'data', true, false, 'Relational database design and SQL', ARRAY['Database design', 'SQL programming', 'Data modeling']),
('CS-310', 'Software Engineering Principles', 3, 3, 'any', 'software_engineering', true, false, 'SDLC, requirements, design, and testing', ARRAY['Software processes', 'Design patterns', 'Quality assurance']),
('CS-315', 'Computer Networks', 3, 3, 'any', 'systems', true, false, 'Network protocols and distributed systems', ARRAY['Network programming', 'Protocol design', 'Distributed systems']),
('CS-320', 'Web Development', 3, 3, 'any', 'programming', true, false, 'Full-stack web application development', ARRAY['Web technologies', 'Client-server architecture', 'API design']),
-- Year 4 Courses
('CS-410', 'Software Architecture & Design', 3, 4, 'any', 'software_engineering', true, false, 'System architecture and design patterns', ARRAY['Architectural patterns', 'Design principles', 'System integration']),
('CS-499', 'Software Engineering Capstone', 6, 4, 'any', 'capstone', true, true, 'Comprehensive software engineering project', ARRAY['Project management', 'System development', 'Professional practice']),
-- Technical Elective Options
('CS-340', 'Machine Learning Fundamentals', 3, 4, 'any', 'artificial_intelligence', false, false, 'Introduction to ML algorithms and applications', ARRAY['ML algorithms', 'Data analysis', 'Model evaluation']),
('CS-350', 'Mobile App Development', 3, 4, 'any', 'programming', false, false, 'iOS and Android application development', ARRAY['Mobile platforms', 'UI design', 'App deployment']),
('CS-360', 'Cybersecurity Fundamentals', 3, 4, 'any', 'security', false, false, 'Information security principles and practices', ARRAY['Security principles', 'Risk assessment', 'Secure coding']),
('CS-370', 'Cloud Computing', 3, 4, 'any', 'systems', false, false, 'Cloud platforms and distributed computing', ARRAY['Cloud services', 'Scalability', 'DevOps practices']),
('CS-380', 'Game Development', 3, 4, 'any', 'programming', false, false, 'Interactive game design and development', ARRAY['Game engines', 'Graphics programming', 'Interactive design']);

-- Add simple prerequisite relationships (no subqueries)
DO $$
DECLARE
  cs101_id UUID;
  cs102_id UUID;
  cs201_id UUID;
  math110_id UUID;
  math141_id UUID;
  math210_id UUID;
  cs301_id UUID;
  cs305_id UUID;
  cs310_id UUID;
  cs315_id UUID;
  cs320_id UUID;
  cs410_id UUID;
  cs499_id UUID;
BEGIN
  -- Get course IDs
  SELECT id INTO cs101_id FROM public.edu_courses WHERE code = 'CS-101';
  SELECT id INTO cs102_id FROM public.edu_courses WHERE code = 'CS-102';
  SELECT id INTO cs201_id FROM public.edu_courses WHERE code = 'CS-201';
  SELECT id INTO math110_id FROM public.edu_courses WHERE code = 'MATH-110';
  SELECT id INTO math141_id FROM public.edu_courses WHERE code = 'MATH-141';
  SELECT id INTO math210_id FROM public.edu_courses WHERE code = 'MATH-210';
  SELECT id INTO cs301_id FROM public.edu_courses WHERE code = 'CS-301';
  SELECT id INTO cs305_id FROM public.edu_courses WHERE code = 'CS-305';
  SELECT id INTO cs310_id FROM public.edu_courses WHERE code = 'CS-310';
  SELECT id INTO cs315_id FROM public.edu_courses WHERE code = 'CS-315';
  SELECT id INTO cs320_id FROM public.edu_courses WHERE code = 'CS-320';
  SELECT id INTO cs410_id FROM public.edu_courses WHERE code = 'CS-410';
  SELECT id INTO cs499_id FROM public.edu_courses WHERE code = 'CS-499';
  
  -- Insert prerequisites
  INSERT INTO public.edu_prereqs (parent_course_id, child_course_id, prereq_type) VALUES
  -- Programming sequence
  (cs101_id, cs102_id, 'prerequisite'),
  (cs102_id, cs201_id, 'prerequisite'),
  -- Math sequence  
  (math110_id, math141_id, 'prerequisite'),
  (math141_id, math210_id, 'prerequisite'),
  -- Advanced CS courses requiring Data Structures
  (cs201_id, cs301_id, 'prerequisite'),
  (cs201_id, cs305_id, 'prerequisite'),
  (cs201_id, cs310_id, 'prerequisite'),
  (cs201_id, cs315_id, 'prerequisite'),
  -- Web Dev requiring Programming II
  (cs102_id, cs320_id, 'prerequisite'),
  -- Capstone requiring multiple courses
  (cs310_id, cs499_id, 'prerequisite'),
  (cs410_id, cs499_id, 'prerequisite');
END $$;

-- Add alternative credit equivalencies
DO $$
DECLARE
  req_eng1_id UUID;
  req_eng2_id UUID;
  req_math110_id UUID;
  req_calc1_id UUID;
  req_stats_id UUID;
  req_social_id UUID;
  req_humanities_id UUID;
  req_comm_id UUID;
  req_prog1_id UUID;
BEGIN
  -- Get requirement IDs
  SELECT id INTO req_eng1_id FROM public.edu_requirements WHERE title = 'English Composition I';
  SELECT id INTO req_eng2_id FROM public.edu_requirements WHERE title = 'English Composition II';
  SELECT id INTO req_math110_id FROM public.edu_requirements WHERE title = 'College Algebra';
  SELECT id INTO req_calc1_id FROM public.edu_requirements WHERE title = 'Calculus I';
  SELECT id INTO req_stats_id FROM public.edu_requirements WHERE title = 'Statistics';
  SELECT id INTO req_social_id FROM public.edu_requirements WHERE title = 'Social Science Elective';
  SELECT id INTO req_humanities_id FROM public.edu_requirements WHERE title = 'Humanities Elective';
  SELECT id INTO req_comm_id FROM public.edu_requirements WHERE title = 'Communications/Speech';
  SELECT id INTO req_prog1_id FROM public.edu_requirements WHERE title = 'Programming Fundamentals I';

  -- Insert equivalencies
  INSERT INTO public.edu_equivalencies (requirement_id, source, provider, external_ref, credits, cost_estimate, time_estimate_hours, notes) VALUES
  -- CLEP options
  (req_eng1_id, 'CLEP', 'CLEP', 'College Composition', 3, 100, 40, 'Pass score 50'),
  (req_math110_id, 'CLEP', 'CLEP', 'College Algebra', 3, 100, 30, 'Pass score 50'),
  (req_social_id, 'CLEP', 'CLEP', 'Introductory Psychology', 3, 100, 25, 'Pass score 50'),
  (req_humanities_id, 'CLEP', 'CLEP', 'Humanities', 3, 100, 40, 'Pass score 50'),
  -- Sophia.org options
  (req_eng2_id, 'ACE', 'Sophia', 'English Composition II', 3, 99, 60, 'Monthly subscription, self-paced'),
  (req_stats_id, 'ACE', 'Sophia', 'Introduction to Statistics', 3, 99, 50, 'Monthly subscription, self-paced'),
  (req_comm_id, 'ACE', 'Sophia', 'Public Speaking', 3, 99, 40, 'Monthly subscription, self-paced'),
  -- Study.com options
  (req_calc1_id, 'ACE', 'Study.com', 'Calculus I', 4, 200, 80, 'Proctored final exam required'),
  (req_prog1_id, 'ACE', 'Study.com', 'Computer Science 101', 3, 200, 100, 'Includes programming exercises');
END $$;
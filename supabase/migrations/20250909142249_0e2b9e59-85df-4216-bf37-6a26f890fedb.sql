-- Seed Software Engineering Program Data
-- Partner policies first
INSERT INTO public.partner_policies (partner_name, partner_code, max_alt_credits, min_residency_credits, upper_division_min, notes) VALUES
('Thomas Edison State University', 'TESU', 90, 30, 18, 'Accepts wide range of alternative credits'),
('Charter Oak State College', 'COSC', 90, 30, 15, 'Liberal transfer credit policy'),
('Western Governors University', 'WGU', 75, 45, 20, 'Competency-based assessment'),
('University of Maryland Global Campus', 'UMGC', 90, 30, 18, 'Strong online programs with transfer articulation');

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

-- Map courses to requirements
INSERT INTO public.edu_requirement_options (requirement_id, course_id)
SELECT r.id, c.id FROM public.edu_requirements r, public.edu_courses c
WHERE (r.title = 'English Composition I' AND c.code = 'ENG-101')
   OR (r.title = 'English Composition II' AND c.code = 'ENG-102')
   OR (r.title = 'College Algebra' AND c.code = 'MATH-110')
   OR (r.title = 'Calculus I' AND c.code = 'MATH-141')
   OR (r.title = 'Statistics' AND c.code = 'STAT-200')
   OR (r.title = 'Natural Science with Lab' AND c.code = 'PHYS-201')
   OR (r.title = 'Social Science Elective' AND c.code = 'PSY-101')
   OR (r.title = 'Humanities Elective' AND c.code = 'HIST-101')
   OR (r.title = 'Communications/Speech' AND c.code = 'COMM-101')
   OR (r.title = 'Programming Fundamentals I' AND c.code = 'CS-101')
   OR (r.title = 'Programming Fundamentals II' AND c.code = 'CS-102')
   OR (r.title = 'Discrete Mathematics' AND c.code = 'MATH-210')
   OR (r.title = 'Data Structures and Algorithms' AND c.code = 'CS-201')
   OR (r.title = 'Computer Architecture' AND c.code = 'CS-205')
   OR (r.title = 'Operating Systems' AND c.code = 'CS-301')
   OR (r.title = 'Database Management Systems' AND c.code = 'CS-305')
   OR (r.title = 'Software Engineering Principles' AND c.code = 'CS-310')
   OR (r.title = 'Computer Networks' AND c.code = 'CS-315')
   OR (r.title = 'Software Architecture & Design' AND c.code = 'CS-410')
   OR (r.title = 'Web Development' AND c.code = 'CS-320')
   OR (r.title = 'Software Engineering Capstone' AND c.code = 'CS-499');

-- Technical electives pool
INSERT INTO public.edu_requirement_options (requirement_id, course_id)
SELECT r.id, c.id FROM public.edu_requirements r, public.edu_courses c
WHERE r.title = 'Technical Electives Pool' 
  AND c.code IN ('CS-340', 'CS-350', 'CS-360', 'CS-370', 'CS-380');
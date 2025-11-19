-- Golden BS CS Program Seed
-- This creates a minimal but complete BS CS program for TESU
-- Approximately 120 credits across 4 years with proper blocks and options coverage

-- First, ensure we have requirement_blocks table structure
-- (This seed assumes the table exists; if not, you'll need to create it first)

-- Clear existing BS CS data (optional, comment out if you want to preserve existing data)
-- DELETE FROM requirement_options WHERE requirement_id IN (
--   SELECT id FROM program_requirements WHERE program_id = 'bs_cs'
-- );
-- DELETE FROM program_requirements WHERE program_id = 'bs_cs';

-- ============================================================
-- YEAR 1: General Education + Foundations (30 credits)
-- ============================================================

-- 1.1 English Composition (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'General Education',
  'English Composition I',
  3,
  'College-level writing and composition'
) ON CONFLICT DO NOTHING;

-- 1.2 Intro to Computer Science (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'Computer Science Core',
  'Introduction to Computer Science',
  3,
  'Programming fundamentals and computational thinking'
) ON CONFLICT DO NOTHING;

-- 1.3 College Mathematics (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'Mathematics',
  'College Algebra',
  3,
  'Foundational algebra for STEM'
) ON CONFLICT DO NOTHING;

-- 1.4 Natural Science (4 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'General Education',
  'Natural Science with Lab',
  4,
  'Lab-based natural science course'
) ON CONFLICT DO NOTHING;

-- 1.5 Social Science (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'General Education',
  'Social Science Elective',
  3,
  'Psychology, sociology, or economics'
) ON CONFLICT DO NOTHING;

-- 1.6 Humanities (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'General Education',
  'Humanities Elective',
  3,
  'History, philosophy, or literature'
) ON CONFLICT DO NOTHING;

-- 1.7 Data Structures (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'Computer Science Core',
  'Data Structures',
  3,
  'Arrays, linked lists, trees, graphs'
) ON CONFLICT DO NOTHING;

-- 1.8 Discrete Mathematics (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'Mathematics',
  'Discrete Mathematics',
  3,
  'Logic, set theory, graph theory'
) ON CONFLICT DO NOTHING;

-- 1.9 General Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'Free Elective',
  'General Elective',
  3,
  'Any college-level course'
) ON CONFLICT DO NOTHING;

-- 1.10 Information Literacy (2 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  1,
  'General Education',
  'Information Literacy',
  2,
  'Research and information evaluation skills'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- YEAR 2: Core CS + Remaining GenEd (30 credits)
-- ============================================================

-- 2.1 Algorithms (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'Computer Science Core',
  'Algorithms',
  3,
  'Algorithm design and analysis'
) ON CONFLICT DO NOTHING;

-- 2.2 Computer Architecture (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'Computer Science Core',
  'Computer Architecture',
  3,
  'Computer organization and assembly language'
) ON CONFLICT DO NOTHING;

-- 2.3 Operating Systems (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'Computer Science Core',
  'Operating Systems',
  3,
  'Process management, memory, file systems'
) ON CONFLICT DO NOTHING;

-- 2.4 Database Systems (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'Computer Science Core',
  'Database Systems',
  3,
  'Relational databases and SQL'
) ON CONFLICT DO NOTHING;

-- 2.5 English Composition II (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'General Education',
  'English Composition II',
  3,
  'Advanced writing and research'
) ON CONFLICT DO NOTHING;

-- 2.6 Statistics (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'Mathematics',
  'Statistics',
  3,
  'Probability and statistical analysis'
) ON CONFLICT DO NOTHING;

-- 2.7 Ethics (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'General Education',
  'Ethics',
  3,
  'Ethical reasoning and decision making'
) ON CONFLICT DO NOTHING;

-- 2.8 Arts (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'General Education',
  'Arts Elective',
  3,
  'Visual or performing arts'
) ON CONFLICT DO NOTHING;

-- 2.9 Software Engineering (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'Computer Science Core',
  'Software Engineering',
  3,
  'SDLC, requirements, design, testing'
) ON CONFLICT DO NOTHING;

-- 2.10 Free Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  2,
  'Free Elective',
  'General Elective',
  3,
  'Any college-level course'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- YEAR 3: Advanced CS + Technical Electives (30 credits)
-- ============================================================

-- 3.1 Computer Networks (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Computer Science Core',
  'Computer Networks',
  3,
  'Network protocols, TCP/IP, routing'
) ON CONFLICT DO NOTHING;

-- 3.2 Programming Languages (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Computer Science Core',
  'Programming Languages',
  3,
  'Language design, paradigms, compilers'
) ON CONFLICT DO NOTHING;

-- 3.3 Artificial Intelligence (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Computer Science Elective',
  'Artificial Intelligence',
  3,
  'AI fundamentals, search, learning'
) ON CONFLICT DO NOTHING;

-- 3.4 Web Development (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Computer Science Elective',
  'Web Development',
  3,
  'Full-stack web application development'
) ON CONFLICT DO NOTHING;

-- 3.5 Cybersecurity (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Computer Science Elective',
  'Cybersecurity',
  3,
  'Security principles, cryptography, threats'
) ON CONFLICT DO NOTHING;

-- 3.6 Mobile Development (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Computer Science Elective',
  'Mobile Application Development',
  3,
  'iOS, Android, cross-platform development'
) ON CONFLICT DO NOTHING;

-- 3.7 Linear Algebra (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Mathematics',
  'Linear Algebra',
  3,
  'Vectors, matrices, linear transformations'
) ON CONFLICT DO NOTHING;

-- 3.8 Technical Writing (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'General Education',
  'Technical Writing',
  3,
  'Documentation and technical communication'
) ON CONFLICT DO NOTHING;

-- 3.9 CS Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Computer Science Elective',
  'Computer Science Elective',
  3,
  'Any upper-division CS course'
) ON CONFLICT DO NOTHING;

-- 3.10 Free Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  3,
  'Free Elective',
  'General Elective',
  3,
  'Any college-level course'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- YEAR 4: Specialization + Capstone (30 credits)
-- ============================================================

-- 4.1 Cloud Computing (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Computer Science Elective',
  'Cloud Computing',
  3,
  'AWS, Azure, distributed systems'
) ON CONFLICT DO NOTHING;

-- 4.2 Machine Learning (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Computer Science Elective',
  'Machine Learning',
  3,
  'ML algorithms, neural networks, deep learning'
) ON CONFLICT DO NOTHING;

-- 4.3 Software Architecture (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Computer Science Elective',
  'Software Architecture',
  3,
  'Design patterns, microservices, scalability'
) ON CONFLICT DO NOTHING;

-- 4.4 Senior Capstone Project (6 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Capstone',
  'Senior Capstone Project',
  6,
  'Independent software project with faculty supervision'
) ON CONFLICT DO NOTHING;

-- 4.5 CS Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Computer Science Elective',
  'Computer Science Elective',
  3,
  'Any upper-division CS course'
) ON CONFLICT DO NOTHING;

-- 4.6 CS Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Computer Science Elective',
  'Computer Science Elective',
  3,
  'Any upper-division CS course'
) ON CONFLICT DO NOTHING;

-- 4.7 Professional Development (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'General Education',
  'Professional Development',
  3,
  'Career preparation, interviewing, leadership'
) ON CONFLICT DO NOTHING;

-- 4.8 Free Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Free Elective',
  'General Elective',
  3,
  'Any college-level course'
) ON CONFLICT DO NOTHING;

-- 4.9 Free Elective (3 credits)
INSERT INTO program_requirements (program_id, year, category, title, credits_required, description)
VALUES (
  'bs_cs',
  4,
  'Free Elective',
  'General Elective',
  3,
  'Any college-level course'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- TOTAL: 120 credits across 4 years
-- Year 1: 30 credits
-- Year 2: 30 credits
-- Year 3: 30 credits
-- Year 4: 30 credits
-- ============================================================

-- Note: This seed provides the program_requirements structure.
-- You'll still need to add requirement_options entries to link these
-- requirements to actual educational_courses for full template generation.
-- The diagnostic page will show what coverage you have after running this.

-- ============================================================================
-- Alternative Credits Seed Data for TESU BSBA
-- ============================================================================
-- 50 alternative credits covering gen-ed and business requirements
-- Sources: CLEP, DSST, Sophia Learning, Study.com
-- ============================================================================

INSERT INTO public.alt_credits (
  source_code,
  identifier,
  title,
  description,
  credits_typical,
  level,
  subject_area,
  ace_id,
  cost_usd,
  duration_estimate_weeks,
  exam_based,
  provider_url,
  metadata
) VALUES

-- ============================================================================
-- CLEP EXAMS (15 exams) - $93 each
-- ============================================================================

-- Written Communication (6 credits available)
('CLEP', 'COLLEGE_COMPOSITION', 'College Composition', 'Covers skills in analysis, argumentation, synthesis, usage, ability to recognize logical development, and research. Equivalent to English Composition I & II.', 6, 100, 'English', 'CLEP-001', 93.00, 2, true, 'https://clep.collegeboard.org/exams/college-composition', '{"passing_score": 50, "exam_length_min": 120}'::jsonb),

('CLEP', 'COLLEGE_COMPOSITION_MODULAR', 'College Composition Modular', 'Tests writing skills taught in most first-year college composition courses. Can be combined with essay for 6 credits.', 3, 100, 'English', 'CLEP-002', 93.00, 2, true, 'https://clep.collegeboard.org/exams/college-composition-modular', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

-- Quantitative (6 credits available)
('CLEP', 'COLLEGE_ALGEBRA', 'College Algebra', 'Covers material usually taught in a one-semester college course in algebra. Includes algebraic operations, equations, inequalities, and functions.', 3, 100, 'Mathematics', 'CLEP-003', 93.00, 4, true, 'https://clep.collegeboard.org/exams/college-algebra', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'COLLEGE_MATHEMATICS', 'College Mathematics', 'Covers material generally taught in a college course for nonmathematics majors. Includes logic, sets, probability, and statistics.', 6, 100, 'Mathematics', 'CLEP-004', 93.00, 4, true, 'https://clep.collegeboard.org/exams/college-mathematics', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

-- Humanities (9+ credits available)
('CLEP', 'HUMANITIES', 'Humanities', 'Tests knowledge of literature, art, and music, and the other performing arts. Covers Western and non-Western civilizations.', 6, 100, 'Humanities', 'CLEP-005', 93.00, 6, true, 'https://clep.collegeboard.org/exams/humanities', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'AMERICAN_LITERATURE', 'American Literature', 'Covers American literature from colonial times to the present. Tests knowledge of literary works, their authors, and their historical context.', 6, 200, 'Literature', 'CLEP-006', 93.00, 6, true, 'https://clep.collegeboard.org/exams/american-literature', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'ENGLISH_LITERATURE', 'English Literature', 'Covers British literature from the Middle Ages to the present. Tests literary analysis and historical context.', 6, 200, 'Literature', 'CLEP-007', 93.00, 6, true, 'https://clep.collegeboard.org/exams/english-literature', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

-- Social Sciences (9+ credits available)
('CLEP', 'INTRO_PSYCHOLOGY', 'Introductory Psychology', 'Covers material taught in a one-semester introductory psychology course. Includes biological bases, sensation, perception, learning, cognition, development, personality, and social psychology.', 3, 100, 'Psychology', 'CLEP-008', 93.00, 4, true, 'https://clep.collegeboard.org/exams/introductory-psychology', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'INTRO_SOCIOLOGY', 'Introductory Sociology', 'Covers material taught in a one-semester introductory sociology course. Includes institutions, social patterns, social processes, social stratification, and social change.', 3, 100, 'Sociology', 'CLEP-009', 93.00, 4, true, 'https://clep.collegeboard.org/exams/introductory-sociology', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'HISTORY_US_I', 'History of the United States I', 'Covers U.S. history from early colonization to the Civil War. Tests political, economic, social, and cultural developments.', 3, 100, 'History', 'CLEP-010', 93.00, 6, true, 'https://clep.collegeboard.org/exams/history-of-the-united-states-i', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'HISTORY_US_II', 'History of the United States II', 'Covers U.S. history from the Civil War to the present. Tests industrialization, foreign policy, and social movements.', 3, 100, 'History', 'CLEP-011', 93.00, 6, true, 'https://clep.collegeboard.org/exams/history-of-the-united-states-ii', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

-- Natural Sciences
('CLEP', 'NATURAL_SCIENCES', 'Natural Sciences', 'Covers a wide range of topics in biological and physical sciences. Equivalent to a two-semester survey course.', 6, 100, 'Science', 'CLEP-012', 93.00, 6, true, 'https://clep.collegeboard.org/exams/natural-sciences', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'BIOLOGY', 'Biology', 'Covers material taught in a one-year college general biology course. Includes molecular and cellular biology, organismal biology, and population biology.', 6, 100, 'Biology', 'CLEP-013', 93.00, 8, true, 'https://clep.collegeboard.org/exams/biology', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

-- Business Core
('CLEP', 'PRINCIPLES_MANAGEMENT', 'Principles of Management', 'Covers topics of management, organizational behavior, human resources, and operational and strategic management.', 3, 100, 'Business', 'CLEP-014', 93.00, 4, true, 'https://clep.collegeboard.org/exams/principles-of-management', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

('CLEP', 'PRINCIPLES_MARKETING', 'Principles of Marketing', 'Covers the role of marketing in society and within a firm, understanding consumer and organizational markets, and the marketing mix.', 3, 100, 'Business', 'CLEP-015', 93.00, 4, true, 'https://clep.collegeboard.org/exams/principles-of-marketing', '{"passing_score": 50, "exam_length_min": 90}'::jsonb),

-- ============================================================================
-- DSST EXAMS (10 exams) - $100 each
-- ============================================================================

-- Business Core
('DSST', 'INTRO_BUSINESS', 'Introduction to Business', 'Covers forms of business ownership, organizational structure, business management, marketing, finance, and entrepreneurship.', 3, 100, 'Business', 'DSST-001', 100.00, 3, true, 'https://getcollegecredit.com/exams/introduction-to-business', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

('DSST', 'BUSINESS_MATH', 'Business Mathematics', 'Covers fundamental mathematics used in business, including interest, discounts, markups, payroll, and financial statements.', 3, 100, 'Mathematics', 'DSST-002', 100.00, 4, true, 'https://getcollegecredit.com/exams/business-mathematics', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

('DSST', 'ORGANIZATIONAL_BEHAVIOR', 'Organizational Behavior', 'Covers theories of motivation, group dynamics, leadership, organizational structure, and organizational culture.', 3, 200, 'Business', 'DSST-003', 100.00, 4, true, 'https://getcollegecredit.com/exams/organizational-behavior', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

('DSST', 'HUMAN_RESOURCE_MGMT', 'Human Resource Management', 'Covers staffing, training and development, compensation, labor relations, and HR legal environment.', 3, 300, 'Business', 'DSST-004', 100.00, 4, true, 'https://getcollegecredit.com/exams/human-resource-management', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

('DSST', 'PRINCIPLES_FINANCE', 'Principles of Finance', 'Covers financial statements, time value of money, risk and return, capital budgeting, and working capital management.', 3, 300, 'Business', 'DSST-005', 100.00, 4, true, 'https://getcollegecredit.com/exams/principles-of-finance', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

-- Social Sciences
('DSST', 'INTRO_LAW_ENFORCEMENT', 'Introduction to Law Enforcement', 'Covers history of law enforcement, contemporary practices, legal aspects, and challenges facing law enforcement.', 3, 100, 'Criminal Justice', 'DSST-006', 100.00, 3, true, 'https://getcollegecredit.com/exams/introduction-to-law-enforcement', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

('DSST', 'ETHICS_AMERICA', 'Ethics in America', 'Covers ethical theories, moral reasoning, and ethical issues in contemporary American society.', 3, 200, 'Philosophy', 'DSST-007', 100.00, 4, true, 'https://getcollegecredit.com/exams/ethics-in-america', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

-- Humanities
('DSST', 'ART_WESTERN_WORLD', 'Art of the Western World', 'Surveys Western art from ancient times through the 20th century. Covers painting, sculpture, and architecture.', 3, 100, 'Art', 'DSST-008', 100.00, 6, true, 'https://getcollegecredit.com/exams/art-of-the-western-world', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

-- Technology/Science
('DSST', 'COMPUTING_INFO_TECH', 'Computing and Information Technology', 'Covers computer hardware, software, databases, networking, security, and systems development.', 3, 100, 'Computer Science', 'DSST-009', 100.00, 4, true, 'https://getcollegecredit.com/exams/computing-and-information-technology', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

('DSST', 'ENVIRONMENTAL_SCIENCE', 'Environmental Science', 'Covers ecological concepts, environmental problems, energy resources, and sustainability.', 3, 100, 'Science', 'DSST-010', 100.00, 6, true, 'https://getcollegecredit.com/exams/environmental-science', '{"passing_score": 400, "exam_length_min": 120}'::jsonb),

-- ============================================================================
-- SOPHIA LEARNING (15 courses) - $99/month subscription
-- ============================================================================

-- Written Communication
('SOPHIA', 'ENG-101', 'English Composition I', 'Develop skills in critical reading, writing, and thinking. Focus on expository and argumentative writing.', 3, 100, 'English', 'ACE-SOPHIA-001', 99.00, 3, false, 'https://www.sophia.org/courses/english-composition-i', '{"touchstones": 5, "self_paced": true}'::jsonb),

('SOPHIA', 'ENG-102', 'English Composition II', 'Advanced composition with emphasis on research, argumentation, and critical analysis.', 3, 100, 'English', 'ACE-SOPHIA-002', 99.00, 3, false, 'https://www.sophia.org/courses/english-composition-ii', '{"touchstones": 5, "self_paced": true}'::jsonb),

-- Oral Communication
('SOPHIA', 'COM-101', 'Public Speaking', 'Fundamentals of public speaking including audience analysis, organization, delivery, and persuasion.', 3, 100, 'Communication', 'ACE-SOPHIA-003', 99.00, 2, false, 'https://www.sophia.org/courses/public-speaking', '{"touchstones": 4, "self_paced": true}'::jsonb),

-- Quantitative
('SOPHIA', 'MAT-101', 'College Algebra', 'Covers algebraic expressions, equations, inequalities, functions, and graphing.', 3, 100, 'Mathematics', 'ACE-SOPHIA-004', 99.00, 4, false, 'https://www.sophia.org/courses/college-algebra', '{"touchstones": 5, "self_paced": true}'::jsonb),

('SOPHIA', 'MAT-121', 'Introduction to Statistics', 'Descriptive and inferential statistics, probability, hypothesis testing, and data analysis.', 3, 100, 'Mathematics', 'ACE-SOPHIA-005', 99.00, 4, false, 'https://www.sophia.org/courses/introduction-to-statistics', '{"touchstones": 5, "self_paced": true}'::jsonb),

-- Social Sciences
('SOPHIA', 'PSY-101', 'Introduction to Psychology', 'Overview of psychological principles including cognition, development, personality, and mental health.', 3, 100, 'Psychology', 'ACE-SOPHIA-006', 99.00, 3, false, 'https://www.sophia.org/courses/introduction-to-psychology', '{"touchstones": 4, "self_paced": true}'::jsonb),

('SOPHIA', 'SOC-101', 'Introduction to Sociology', 'Study of human social behavior, groups, institutions, and social change.', 3, 100, 'Sociology', 'ACE-SOPHIA-007', 99.00, 3, false, 'https://www.sophia.org/courses/introduction-to-sociology', '{"touchstones": 4, "self_paced": true}'::jsonb),

('SOPHIA', 'ECO-101', 'Macroeconomics', 'Study of aggregate economic activity, GDP, inflation, unemployment, and fiscal/monetary policy.', 3, 100, 'Economics', 'ACE-SOPHIA-008', 99.00, 4, false, 'https://www.sophia.org/courses/macroeconomics', '{"touchstones": 5, "self_paced": true}'::jsonb),

('SOPHIA', 'ECO-102', 'Microeconomics', 'Study of individual economic decisions, supply and demand, market structures, and consumer behavior.', 3, 100, 'Economics', 'ACE-SOPHIA-009', 99.00, 4, false, 'https://www.sophia.org/courses/microeconomics', '{"touchstones": 5, "self_paced": true}'::jsonb),

-- Humanities
('SOPHIA', 'PHI-101', 'Introduction to Ethics', 'Ethical theories, moral reasoning, and contemporary ethical issues.', 3, 100, 'Philosophy', 'ACE-SOPHIA-010', 99.00, 3, false, 'https://www.sophia.org/courses/introduction-to-ethics', '{"touchstones": 4, "self_paced": true}'::jsonb),

-- Business Core
('SOPHIA', 'BUS-101', 'Introduction to Business', 'Overview of business functions, management, marketing, finance, and entrepreneurship.', 3, 100, 'Business', 'ACE-SOPHIA-011', 99.00, 3, false, 'https://www.sophia.org/courses/introduction-to-business', '{"touchstones": 4, "self_paced": true}'::jsonb),

('SOPHIA', 'BUS-210', 'Business Communication', 'Professional writing, presentations, interpersonal communication in business contexts.', 3, 200, 'Business', 'ACE-SOPHIA-012', 99.00, 3, false, 'https://www.sophia.org/courses/business-communication', '{"touchstones": 5, "self_paced": true}'::jsonb),

('SOPHIA', 'BUS-220', 'Project Management', 'Project planning, scheduling, resource allocation, risk management, and project closure.', 3, 200, 'Business', 'ACE-SOPHIA-013', 99.00, 4, false, 'https://www.sophia.org/courses/project-management', '{"touchstones": 5, "self_paced": true}'::jsonb),

-- Natural Science
('SOPHIA', 'ENV-101', 'Environmental Science', 'Study of ecosystems, biodiversity, pollution, climate change, and sustainability.', 3, 100, 'Science', 'ACE-SOPHIA-014', 99.00, 4, false, 'https://www.sophia.org/courses/environmental-science', '{"touchstones": 4, "self_paced": true}'::jsonb),

-- Civic/Global
('SOPHIA', 'POL-101', 'American Government', 'Structure and function of U.S. government, Constitution, political parties, and civil liberties.', 3, 100, 'Political Science', 'ACE-SOPHIA-015', 99.00, 3, false, 'https://www.sophia.org/courses/american-government', '{"touchstones": 4, "self_paced": true}'::jsonb),

-- ============================================================================
-- STUDY.COM (10 courses) - $199/month subscription
-- ============================================================================

-- Business Core (Upper Level)
('STUDY_COM', 'BUS-303', 'Financial Accounting', 'Financial statements, GAAP, balance sheet, income statement, cash flows, and financial analysis.', 3, 300, 'Business', 'ACE-STUDY-001', 199.00, 4, false, 'https://study.com/academy/course/financial-accounting.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-305', 'Managerial Accounting', 'Cost behavior, budgeting, variance analysis, performance evaluation, and decision making.', 3, 300, 'Business', 'ACE-STUDY-002', 199.00, 4, false, 'https://study.com/academy/course/managerial-accounting.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-307', 'Operations Management', 'Process analysis, capacity planning, inventory management, quality control, and supply chain.', 3, 300, 'Business', 'ACE-STUDY-003', 199.00, 4, false, 'https://study.com/academy/course/operations-management.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-310', 'Business Strategy', 'Strategic analysis, competitive advantage, strategy formulation, implementation, and evaluation.', 3, 300, 'Business', 'ACE-STUDY-004', 199.00, 5, false, 'https://study.com/academy/course/business-strategy.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-320', 'International Business', 'Global business environment, international trade, foreign exchange, multinational corporations.', 3, 300, 'Business', 'ACE-STUDY-005', 199.00, 4, false, 'https://study.com/academy/course/international-business.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-330', 'Business Ethics', 'Ethical theories, corporate social responsibility, stakeholder analysis, and ethical decision making.', 3, 300, 'Business', 'ACE-STUDY-006', 199.00, 3, false, 'https://study.com/academy/course/business-ethics.html', '{"quizzes": 12, "proctored_final": true}'::jsonb),

-- Business Core (Lower Level)
('STUDY_COM', 'BUS-201', 'Business Law I', 'Legal system, contracts, torts, criminal law, and business organizations.', 3, 200, 'Business', 'ACE-STUDY-007', 199.00, 4, false, 'https://study.com/academy/course/business-law-i.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-202', 'Principles of Management', 'Planning, organizing, leading, controlling, organizational behavior, and decision making.', 3, 200, 'Business', 'ACE-STUDY-008', 199.00, 4, false, 'https://study.com/academy/course/principles-of-management.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-203', 'Principles of Marketing', 'Marketing concepts, consumer behavior, market research, product, price, place, promotion.', 3, 200, 'Business', 'ACE-STUDY-009', 199.00, 4, false, 'https://study.com/academy/course/principles-of-marketing.html', '{"quizzes": 15, "proctored_final": true}'::jsonb),

('STUDY_COM', 'BUS-204', 'Business Statistics', 'Descriptive statistics, probability distributions, hypothesis testing, regression, and correlation.', 3, 200, 'Business', 'ACE-STUDY-010', 199.00, 5, false, 'https://study.com/academy/course/business-statistics.html', '{"quizzes": 15, "proctored_final": true}'::jsonb)

ON CONFLICT (source_code, identifier) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  source_code,
  COUNT(*) as course_count,
  ROUND(AVG(cost_usd), 2) as avg_cost,
  ROUND(AVG(duration_estimate_weeks), 1) as avg_weeks
FROM public.alt_credits
GROUP BY source_code
ORDER BY source_code;

-- Count by subject area
SELECT 
  subject_area,
  COUNT(*) as course_count
FROM public.alt_credits
GROUP BY subject_area
ORDER BY course_count DESC;

-- Summary
SELECT 
  COUNT(*) as total_alt_credits,
  COUNT(DISTINCT source_code) as unique_providers,
  COUNT(DISTINCT subject_area) as subject_areas_covered,
  SUM(CASE WHEN exam_based = true THEN 1 ELSE 0 END) as exam_courses,
  SUM(CASE WHEN exam_based = false THEN 1 ELSE 0 END) as online_courses
FROM public.alt_credits;

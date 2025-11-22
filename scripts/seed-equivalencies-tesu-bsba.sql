-- ============================================================================
-- Cross-Institution Equivalency Mappings for TESU BSBA
-- ============================================================================
-- Maps 50 alternative credits to TESU course equivalents
-- Based on official TESU transfer guides and ACE recommendations
-- ============================================================================

-- Insert equivalencies connecting alt_credits to TESU courses
INSERT INTO public.cross_institution_equivalencies (
  alt_credit_id,
  institution_id,
  institutional_course_code,
  institutional_course_name,
  credits_awarded,
  level,
  gened_category_code,
  requirement_area,
  confidence,
  source_documentation,
  last_verified_date,
  notes
)
SELECT 
  ac.id as alt_credit_id,
  (SELECT id FROM public.institutions WHERE code = 'TESU') as institution_id,
  mapping.course_code,
  mapping.course_name,
  mapping.credits_awarded,
  mapping.level,
  mapping.gened_category,
  mapping.req_area,
  mapping.confidence,
  mapping.source_url,
  mapping.verified_date,
  mapping.notes
FROM public.alt_credits ac
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    
    -- ========================================================================
    -- CLEP EXAMS (15 mappings)
    -- ========================================================================
    
    -- Written Communication
    ('CLEP', 'COLLEGE_COMPOSITION', 'ENC-101-102', 'English Composition I & II', 6, 100, 'WRITTEN_COMM', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Satisfies entire Written Communication requirement'),
    
    ('CLEP', 'COLLEGE_COMPOSITION_MODULAR', 'ENC-101', 'English Composition I', 3, 100, 'WRITTEN_COMM', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Covers first-semester composition'),
    
    -- Quantitative
    ('CLEP', 'COLLEGE_ALGEBRA', 'MAT-119', 'College Algebra', 3, 100, 'QUANTITATIVE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Satisfies Quantitative Literacy requirement'),
    
    ('CLEP', 'COLLEGE_MATHEMATICS', 'MAT-121', 'College Mathematics', 6, 100, 'QUANTITATIVE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Covers statistics and probability - exceeds requirement'),
    
    -- Humanities
    ('CLEP', 'HUMANITIES', 'HUM-101-102', 'Humanities Survey', 6, 100, 'HUMANITIES', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Covers art, literature, music, philosophy'),
    
    ('CLEP', 'AMERICAN_LITERATURE', 'ENG-251', 'American Literature', 6, 200, 'HUMANITIES', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Survey of American literary works'),
    
    ('CLEP', 'ENGLISH_LITERATURE', 'ENG-261', 'English Literature', 6, 200, 'HUMANITIES', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Survey of British literary works'),
    
    -- Social Sciences
    ('CLEP', 'INTRO_PSYCHOLOGY', 'PSY-101', 'Introduction to Psychology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Foundational psychology course'),
    
    ('CLEP', 'INTRO_SOCIOLOGY', 'SOC-101', 'Introduction to Sociology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Foundational sociology course'),
    
    ('CLEP', 'HISTORY_US_I', 'HIS-113', 'United States History I', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Colonial period through Civil War'),
    
    ('CLEP', 'HISTORY_US_II', 'HIS-114', 'United States History II', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Civil War to present'),
    
    -- Natural Sciences
    ('CLEP', 'NATURAL_SCIENCES', 'NSC-101', 'Natural Sciences', 6, 100, 'NATURAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Covers both biological and physical sciences'),
    
    ('CLEP', 'BIOLOGY', 'BIO-101', 'General Biology', 6, 100, 'NATURAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Comprehensive biology course with lab equivalent'),
    
    -- Business Core
    ('CLEP', 'PRINCIPLES_MANAGEMENT', 'MAN-321', 'Principles of Management', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Upper-level management course'),
    
    ('CLEP', 'PRINCIPLES_MARKETING', 'MAR-301', 'Principles of Marketing', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-clep', '2025-01-15'::date, 'Upper-level marketing course'),
    
    -- ========================================================================
    -- DSST EXAMS (10 mappings)
    -- ========================================================================
    
    -- Business
    ('DSST', 'INTRO_BUSINESS', 'BUS-101', 'Introduction to Business', 3, 100, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Business fundamentals'),
    
    ('DSST', 'BUSINESS_MATH', 'MAT-108', 'Business Mathematics', 3, 100, 'QUANTITATIVE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Applied mathematics for business'),
    
    ('DSST', 'ORGANIZATIONAL_BEHAVIOR', 'MAN-331', 'Organizational Behavior', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Upper-level OB course'),
    
    ('DSST', 'HUMAN_RESOURCE_MGMT', 'MAN-373', 'Human Resource Management', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Upper-level HR course'),
    
    ('DSST', 'PRINCIPLES_FINANCE', 'FIN-301', 'Principles of Finance', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Upper-level finance course'),
    
    -- Social Sciences & Humanities
    ('DSST', 'INTRO_LAW_ENFORCEMENT', 'CRJ-101', 'Introduction to Criminal Justice', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Criminal justice foundations'),
    
    ('DSST', 'ETHICS_AMERICA', 'PHI-384', 'Ethics in America', 3, 300, 'CIVIC_GLOBAL', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Applied ethics and civic engagement'),
    
    ('DSST', 'ART_WESTERN_WORLD', 'ART-101', 'Art History', 3, 100, 'HUMANITIES', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Western art survey'),
    
    ('DSST', 'COMPUTING_INFO_TECH', 'CIS-107', 'Introduction to Computing', 3, 100, NULL, 'free_elective', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'IT fundamentals'),
    
    ('DSST', 'ENVIRONMENTAL_SCIENCE', 'ENV-101', 'Environmental Science', 3, 100, 'NATURAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/academics/catalog/transfer-credit-dsst', '2025-01-15'::date, 'Environmental studies'),
    
    -- ========================================================================
    -- SOPHIA LEARNING (15 mappings)
    -- ========================================================================
    
    -- Written Communication
    ('SOPHIA', 'ENG-101', 'ENC-101', 'English Composition I', 3, 100, 'WRITTEN_COMM', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'First semester composition - official Sophia pathway'),
    
    ('SOPHIA', 'ENG-102', 'ENC-102', 'English Composition II', 3, 100, 'WRITTEN_COMM', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Second semester composition - official Sophia pathway'),
    
    -- Oral Communication
    ('SOPHIA', 'COM-101', 'COM-209', 'Public Speaking', 3, 200, 'ORAL_COMM', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Satisfies Oral Communication requirement'),
    
    -- Quantitative
    ('SOPHIA', 'MAT-101', 'MAT-119', 'College Algebra', 3, 100, 'QUANTITATIVE', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Satisfies Quantitative Literacy requirement'),
    
    ('SOPHIA', 'MAT-121', 'STA-201', 'Introduction to Statistics', 3, 200, 'QUANTITATIVE', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Statistics for business and social sciences'),
    
    -- Social Sciences
    ('SOPHIA', 'PSY-101', 'PSY-101', 'Introduction to Psychology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Foundational psychology - official Sophia pathway'),
    
    ('SOPHIA', 'SOC-101', 'SOC-101', 'Introduction to Sociology', 3, 100, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Foundational sociology - official Sophia pathway'),
    
    ('SOPHIA', 'ECO-101', 'ECO-211', 'Macroeconomics', 3, 200, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Macro theory and policy'),
    
    ('SOPHIA', 'ECO-102', 'ECO-212', 'Microeconomics', 3, 200, 'SOCIAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Micro theory and markets'),
    
    -- Humanities
    ('SOPHIA', 'PHI-101', 'PHI-384', 'Introduction to Ethics', 3, 300, 'CIVIC_GLOBAL', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Satisfies Civic & Global Engagement'),
    
    -- Business Core
    ('SOPHIA', 'BUS-101', 'BUS-101', 'Introduction to Business', 3, 100, NULL, 'major', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Business fundamentals - official Sophia pathway'),
    
    ('SOPHIA', 'BUS-210', 'BUS-299', 'Business Communication', 3, 200, NULL, 'major', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Professional communication skills'),
    
    ('SOPHIA', 'BUS-220', 'MAN-372', 'Project Management', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Upper-level project management'),
    
    -- Natural Science
    ('SOPHIA', 'ENV-101', 'ENV-101', 'Environmental Science', 3, 100, 'NATURAL_SCIENCE', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'Satisfies Natural Science requirement'),
    
    -- Civic/Global
    ('SOPHIA', 'POL-101', 'POS-282', 'American Government', 3, 200, 'CIVIC_GLOBAL', 'gened', 1.0, 'https://www.tesu.edu/sophia-pathways', '2025-01-15'::date, 'US political system and civic engagement'),
    
    -- ========================================================================
    -- STUDY.COM (10 mappings)
    -- ========================================================================
    
    -- Upper-Level Business
    ('STUDY_COM', 'BUS-303', 'ACC-301', 'Financial Accounting', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Upper-level accounting - official Study.com pathway'),
    
    ('STUDY_COM', 'BUS-305', 'ACC-302', 'Managerial Accounting', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Upper-level cost accounting'),
    
    ('STUDY_COM', 'BUS-307', 'MAN-374', 'Operations Management', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Upper-level operations'),
    
    ('STUDY_COM', 'BUS-310', 'MAN-411', 'Strategic Management', 3, 400, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Capstone-level strategy course'),
    
    ('STUDY_COM', 'BUS-320', 'MAN-375', 'International Business', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Upper-level global business'),
    
    ('STUDY_COM', 'BUS-330', 'BUS-421', 'Business Ethics', 3, 400, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Upper-level ethics in business context'),
    
    -- Lower-Level Business
    ('STUDY_COM', 'BUS-201', 'BUS-241', 'Business Law I', 3, 200, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Legal environment of business'),
    
    ('STUDY_COM', 'BUS-202', 'MAN-321', 'Principles of Management', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Management fundamentals'),
    
    ('STUDY_COM', 'BUS-203', 'MAR-301', 'Principles of Marketing', 3, 300, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Marketing fundamentals'),
    
    ('STUDY_COM', 'BUS-204', 'STA-201', 'Business Statistics', 3, 200, NULL, 'major', 1.0, 'https://www.tesu.edu/studycom-pathways', '2025-01-15'::date, 'Statistics for business decisions')
    
  ) AS v(source_code, identifier, course_code, course_name, credits_awarded, level, gened_category, req_area, confidence, source_url, verified_date, notes)
) AS mapping
WHERE ac.source_code = mapping.source_code 
  AND ac.identifier = mapping.identifier;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check total equivalencies created
SELECT COUNT(*) as total_equivalencies FROM public.cross_institution_equivalencies;

-- Count by provider
SELECT 
  ac.source_code,
  COUNT(*) as equivalency_count
FROM public.cross_institution_equivalencies cie
JOIN public.alt_credits ac ON cie.alt_credit_id = ac.id
GROUP BY ac.source_code
ORDER BY ac.source_code;

-- Count by gen-ed category
SELECT 
  gened_category_code,
  COUNT(*) as equivalency_count
FROM public.cross_institution_equivalencies
WHERE gened_category_code IS NOT NULL
GROUP BY gened_category_code
ORDER BY gened_category_code;

-- Count by requirement area
SELECT 
  requirement_area,
  COUNT(*) as equivalency_count
FROM public.cross_institution_equivalencies
GROUP BY requirement_area
ORDER BY requirement_area;

-- Count by level
SELECT 
  level,
  COUNT(*) as equivalency_count
FROM public.cross_institution_equivalencies
GROUP BY level
ORDER BY level;

-- Sample view of equivalencies with alt credit details
SELECT 
  ac.source_code,
  ac.identifier,
  ac.title as alt_credit_title,
  cie.institutional_course_code,
  cie.institutional_course_name,
  cie.credits_awarded,
  cie.level,
  cie.gened_category_code,
  cie.requirement_area,
  cie.confidence
FROM public.cross_institution_equivalencies cie
JOIN public.alt_credits ac ON cie.alt_credit_id = ac.id
ORDER BY ac.source_code, ac.identifier
LIMIT 10;

-- Check gen-ed coverage
SELECT 
  gc.category_code,
  gc.category_name,
  gc.credits_required,
  COUNT(DISTINCT cie.id) as available_options
FROM public.gened_categories gc
LEFT JOIN public.cross_institution_equivalencies cie 
  ON cie.gened_category_code = gc.category_code
WHERE gc.institution_id = (SELECT id FROM public.institutions WHERE code = 'TESU')
GROUP BY gc.category_code, gc.category_name, gc.credits_required
ORDER BY gc.display_order;

-- Summary stats
SELECT 
  COUNT(*) as total_equivalencies,
  COUNT(DISTINCT alt_credit_id) as unique_alt_credits,
  COUNT(DISTINCT institutional_course_code) as unique_tesu_courses,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN gened_category_code IS NOT NULL THEN 1 END) as gen_ed_mappings,
  COUNT(CASE WHEN requirement_area = 'major' THEN 1 END) as major_mappings,
  COUNT(CASE WHEN level >= 300 THEN 1 END) as upper_level_mappings
FROM public.cross_institution_equivalencies;

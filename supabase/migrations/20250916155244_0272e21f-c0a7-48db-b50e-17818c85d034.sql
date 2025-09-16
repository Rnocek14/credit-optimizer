-- Create missing courses for track specializations

-- Data Science courses
INSERT INTO edu_courses (code, title, credits, area, level_year, is_core, is_capstone, description) VALUES 
('DS-301', 'Data Analysis and Visualization', 3, 'data_science', 3, false, false, 'Statistical analysis and data visualization techniques'),
('DS-302', 'Introduction to Machine Learning', 3, 'data_science', 3, false, false, 'Fundamentals of machine learning algorithms'),
('DS-401', 'Advanced Machine Learning', 3, 'data_science', 4, false, false, 'Deep learning and advanced ML techniques'),
('DS-402', 'Big Data Analytics', 3, 'data_science', 4, false, false, 'Large-scale data processing and analysis');

-- Cybersecurity courses  
INSERT INTO edu_courses (code, title, credits, area, level_year, is_core, is_capstone, description) VALUES
('CYB-301', 'Network Security Fundamentals', 3, 'cybersecurity', 3, false, false, 'Network security principles and protocols'),
('CYB-302', 'Ethical Hacking and Penetration Testing', 3, 'cybersecurity', 3, false, false, 'Offensive security and vulnerability assessment'),
('CYB-401', 'Advanced Threat Detection', 3, 'cybersecurity', 4, false, false, 'Advanced cybersecurity threat analysis'),
('CYB-402', 'Digital Forensics', 3, 'cybersecurity', 4, false, false, 'Computer forensics and incident response');

-- Mobile Development courses
INSERT INTO edu_courses (code, title, credits, area, level_year, is_core, is_capstone, description) VALUES
('MOB-301', 'iOS Development', 3, 'mobile_development', 3, false, false, 'Native iOS app development with Swift'),
('MOB-302', 'Android Development', 3, 'mobile_development', 3, false, false, 'Native Android app development with Kotlin'),  
('MOB-401', 'Cross-Platform Development', 3, 'mobile_development', 4, false, false, 'React Native and Flutter development'),
('MOB-402', 'Mobile UI/UX Design', 3, 'mobile_development', 4, false, false, 'Mobile interface design principles');

-- Create missing requirement blocks with slugs
INSERT INTO requirement_blocks (title, slug, rule_type, k, level_year, area) VALUES
('Data Analysis', 'data-analysis', 'K_OF_N', 2, 3, 'data_science'),
('Machine Learning', 'machine-learning', 'K_OF_N', 2, 4, 'data_science'),
('Security Fundamentals', 'security-fundamentals', 'K_OF_N', 2, 3, 'cybersecurity'),
('Advanced Security', 'advanced-security', 'K_OF_N', 2, 4, 'cybersecurity'),
('Mobile Frameworks', 'mobile-frameworks', 'K_OF_N', 2, 3, 'mobile_development'),
('Advanced Mobile', 'advanced-mobile', 'K_OF_N', 2, 4, 'mobile_development');

-- Create track-specific degree completion blocks
INSERT INTO requirement_blocks (title, slug, rule_type, level_year, area) VALUES
('B.S. Data Science', 'degree-completion-data-science', 'ALL', 4, 'degree'),
('B.S. Cybersecurity', 'degree-completion-cybersecurity', 'ALL', 4, 'degree'),  
('B.S. Mobile Development', 'degree-completion-mobile', 'ALL', 4, 'degree');

-- Update the existing degree completion to be software engineering specific
UPDATE requirement_blocks SET title = 'B.S. Software Engineering', slug = 'degree-completion-software-engineering' WHERE title = 'Degree Completion';

-- Create block members (course assignments to blocks)
INSERT INTO block_members (block_id, course_id)
SELECT rb.id, ec.id FROM requirement_blocks rb, edu_courses ec 
WHERE rb.slug = 'data-analysis' AND ec.code IN ('DS-301', 'DS-302');

INSERT INTO block_members (block_id, course_id)  
SELECT rb.id, ec.id FROM requirement_blocks rb, edu_courses ec
WHERE rb.slug = 'machine-learning' AND ec.code IN ('DS-401', 'DS-402');

INSERT INTO block_members (block_id, course_id)
SELECT rb.id, ec.id FROM requirement_blocks rb, edu_courses ec
WHERE rb.slug = 'security-fundamentals' AND ec.code IN ('CYB-301', 'CYB-302');

INSERT INTO block_members (block_id, course_id)
SELECT rb.id, ec.id FROM requirement_blocks rb, edu_courses ec  
WHERE rb.slug = 'advanced-security' AND ec.code IN ('CYB-401', 'CYB-402');

INSERT INTO block_members (block_id, course_id)
SELECT rb.id, ec.id FROM requirement_blocks rb, edu_courses ec
WHERE rb.slug = 'mobile-frameworks' AND ec.code IN ('MOB-301', 'MOB-302');

INSERT INTO block_members (block_id, course_id)
SELECT rb.id, ec.id FROM requirement_blocks rb, edu_courses ec
WHERE rb.slug = 'advanced-mobile' AND ec.code IN ('MOB-401', 'MOB-402');

-- Create block gates for all new blocks
INSERT INTO block_gates (block_id)
SELECT id FROM requirement_blocks 
WHERE slug IN ('data-analysis', 'machine-learning', 'security-fundamentals', 'advanced-security', 'mobile-frameworks', 'advanced-mobile', 'degree-completion-data-science', 'degree-completion-cybersecurity', 'degree-completion-mobile');

-- Create prerequisite edges for track progressions
INSERT INTO prereq_to_block (source_gate_id, target_block_id)
SELECT bg_source.id, rb_target.id
FROM block_gates bg_source 
JOIN requirement_blocks rb_source ON rb_source.id = bg_source.block_id
CROSS JOIN requirement_blocks rb_target
WHERE (rb_source.slug = 'core-i' AND rb_target.slug = 'data-analysis')
   OR (rb_source.slug = 'data-analysis' AND rb_target.slug = 'machine-learning')  
   OR (rb_source.slug = 'core-i' AND rb_target.slug = 'security-fundamentals')
   OR (rb_source.slug = 'security-fundamentals' AND rb_target.slug = 'advanced-security')
   OR (rb_source.slug = 'core-i' AND rb_target.slug = 'mobile-frameworks') 
   OR (rb_source.slug = 'mobile-frameworks' AND rb_target.slug = 'advanced-mobile')
   OR (rb_source.slug = 'machine-learning' AND rb_target.slug = 'degree-completion-data-science')
   OR (rb_source.slug = 'advanced-security' AND rb_target.slug = 'degree-completion-cybersecurity')
   OR (rb_source.slug = 'advanced-mobile' AND rb_target.slug = 'degree-completion-mobile')
   OR (rb_source.slug = 'capstone' AND rb_target.slug = 'degree-completion-software-engineering');
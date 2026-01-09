-- Add residency-specific templates for PHOENIX, UMGC, STRAYER
INSERT INTO scrape_url_templates (institution_code, url, page_type, priority) VALUES
-- PHOENIX: Academic policies / degree requirements pages
('PHOENIX', 'https://www.phoenix.edu/content/dam/edu/tuition/doc/academic-catalog.pdf', 'residency_policy', 1),
('PHOENIX', 'https://www.phoenix.edu/degrees.html', 'degree_requirements', 2),

-- UMGC: Catalog academic policies (residency typically in catalog)
('UMGC', 'https://www.umgc.edu/current-students/learning-resources/academic-policies', 'residency_policy', 1),
('UMGC', 'https://catalog.umgc.edu/undergraduate-catalog/academic-requirements-policies', 'residency_policy', 1),

-- STRAYER: Academic policies / catalog graduation requirements
('STRAYER', 'https://catalog.strayer.edu/undergraduate/academic-policies', 'residency_policy', 1),
('STRAYER', 'https://catalog.strayer.edu/undergraduate/graduation-requirements', 'degree_requirements', 2)

ON CONFLICT (institution_code, url) DO NOTHING;
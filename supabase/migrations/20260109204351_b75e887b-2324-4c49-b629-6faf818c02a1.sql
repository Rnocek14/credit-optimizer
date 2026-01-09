-- Add residency-specific templates for the 5 target schools
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority) VALUES
  -- SNHU: Add residency/graduation requirements pages
  ('SNHU', 'residency_policy', 'https://www.snhu.edu/consumer-information/graduation-requirements', 1),
  ('SNHU', 'residency_policy', 'https://www.snhu.edu/about-us/academic-information', 1),
  
  -- WGU: Add academic policy/requirements pages (competency-based but has credit equivalents)
  ('WGU', 'residency_policy', 'https://www.wgu.edu/about/academic-policies.html', 1),
  ('WGU', 'residency_policy', 'https://www.wgu.edu/admissions/bachelor-degree-requirements.html', 1),
  
  -- CAPELLA: Add graduation/residency requirements
  ('CAPELLA', 'residency_policy', 'https://www.capella.edu/about/academic-policies', 1),
  ('CAPELLA', 'residency_policy', 'https://catalog.capella.edu/content.php?catoid=40&navoid=9017', 1),
  
  -- WALDEN: Add academic requirements pages  
  ('WALDEN', 'residency_policy', 'https://www.waldenu.edu/about/academic-requirements', 1),
  ('WALDEN', 'residency_policy', 'https://catalog.waldenu.edu/content.php?catoid=235&navoid=74478', 1),
  
  -- EMPIRE: Promote registrar to priority 1, add degree requirements
  ('EMPIRE', 'residency_policy', 'https://www.esc.edu/degrees-programs/degree-requirements/', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = EXCLUDED.priority, page_type = EXCLUDED.page_type;
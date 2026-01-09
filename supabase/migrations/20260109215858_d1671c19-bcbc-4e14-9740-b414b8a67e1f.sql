-- Delete old templates for CAPELLA, EMPIRE, WALDEN
DELETE FROM scrape_url_templates WHERE institution_code IN ('CAPELLA', 'EMPIRE', 'WALDEN');

-- Insert new targeted templates with SmartCatalog deep-links
INSERT INTO scrape_url_templates (institution_code, url, page_type, priority) VALUES
  -- CAPELLA - SmartCatalog deep-links for transfer/residency policies
  ('CAPELLA', 'https://capella.smartcatalogiq.com/current/academic-catalog/university-policies/credit-for-prior-learning', 'transfer_policy', 1),
  ('CAPELLA', 'https://capella.smartcatalogiq.com/current/academic-catalog/university-policies/academic-residency', 'residency_policy', 1),
  ('CAPELLA', 'https://capella.smartcatalogiq.com/current/academic-catalog/university-policies/transfer-credit', 'transfer_policy', 1),
  ('CAPELLA', 'https://capella.smartcatalogiq.com/current/academic-catalog/general-academic-policies', 'catalog', 2),
  ('CAPELLA', 'https://www.capella.edu/admissions/transfer-credits/', 'transfer_info', 2),
  
  -- EMPIRE - SUNY Empire State deep-links (using correct sunyempire.edu domain)
  ('EMPIRE', 'https://catalog.sunyempire.edu/undergraduate/transfer-credits/', 'transfer_policy', 1),
  ('EMPIRE', 'https://catalog.sunyempire.edu/undergraduate/residency-requirements/', 'residency_policy', 1),
  ('EMPIRE', 'https://catalog.sunyempire.edu/undergraduate/academic-policies/', 'catalog', 1),
  ('EMPIRE', 'https://www.sunyempire.edu/admissions/transfer-credit/', 'transfer_info', 2),
  ('EMPIRE', 'https://www.sunyempire.edu/degrees-programs/degree-requirements/', 'residency', 2),
  
  -- WALDEN - catalog deep-links for transfer/residency
  ('WALDEN', 'https://catalog.waldenu.edu/content.php?catoid=179&navoid=71377', 'transfer_policy', 1),
  ('WALDEN', 'https://catalog.waldenu.edu/content.php?catoid=179&navoid=71378', 'residency_policy', 1),
  ('WALDEN', 'https://www.waldenu.edu/admissions/transfer-of-credit', 'transfer_info', 2)
ON CONFLICT (institution_code, url) DO UPDATE SET page_type = EXCLUDED.page_type, priority = EXCLUDED.priority;
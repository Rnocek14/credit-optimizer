-- Fix EMPIRE templates: esc.edu domain is wrong, should be sunyempire.edu
UPDATE scrape_url_templates 
SET url = REPLACE(url, 'www.esc.edu', 'www.sunyempire.edu')
WHERE institution_code = 'EMPIRE' AND url LIKE '%www.esc.edu%';

-- Fix catalog.esc.edu -> catalog.sunyempire.edu
UPDATE scrape_url_templates 
SET url = REPLACE(url, 'catalog.esc.edu', 'catalog.sunyempire.edu')
WHERE institution_code = 'EMPIRE' AND url LIKE '%catalog.esc.edu%';

-- Fix SNHU: Remove broken URLs and add working ones
DELETE FROM scrape_url_templates 
WHERE institution_code = 'SNHU' 
AND url IN (
  'https://www.snhu.edu/consumer-information/graduation-requirements',
  'https://www.snhu.edu/about-us/academic-information',
  'https://www.snhu.edu/consumer-information/academic-catalogs',
  'https://www.snhu.edu/admission/transfer-credits'
);

-- Add SNHU working transfer page (already works at 20k chars)
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority)
VALUES 
  ('SNHU', 'transfer_policy', 'https://www.snhu.edu/admission/transferring-credits', 1),
  ('SNHU', 'catalog', 'https://catalog.snhu.edu/', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = 1;

-- Fix CAPELLA: Use SmartCatalog URLs that work
DELETE FROM scrape_url_templates 
WHERE institution_code = 'CAPELLA' 
AND url IN (
  'https://www.capella.edu/about/academic-policies',
  'https://www.capella.edu/admissions/transfer-credit/',
  'https://catalog.capella.edu/content.php?catoid=40&navoid=9017'
);

-- Add working Capella SmartCatalog base (1k chars but real content)
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority)
VALUES 
  ('CAPELLA', 'catalog', 'https://catalog.capella.edu/', 1),
  ('CAPELLA', 'catalog', 'https://capella.smartcatalogiq.com/', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = 1;
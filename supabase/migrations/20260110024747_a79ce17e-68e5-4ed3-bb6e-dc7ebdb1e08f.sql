-- Remove broken CAPELLA URLs that return 404
-- The PDF and admissions URLs are now dead

-- First, delete the broken priority-1 PDF URL 
DELETE FROM scrape_url_templates
WHERE institution_code = 'CAPELLA'
  AND url = 'https://www.capella.edu/sites/default/files/2025-02/capella-catalog-2025.pdf';

-- Demote the broken admissions transfer-credits URL to priority 9
UPDATE scrape_url_templates
SET priority = 9
WHERE institution_code = 'CAPELLA'
  AND url = 'https://www.capella.edu/admissions/transfer-credits/';

-- For now, CAPELLA has no valid priority-1 URLs
-- Need to find working URLs before rescanning
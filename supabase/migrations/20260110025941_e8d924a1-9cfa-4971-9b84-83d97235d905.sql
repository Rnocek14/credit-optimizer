-- Add verified working URLs for faster path to 5+ ACTIVE

-- EMPIRE: Add the transfer students page and bulletin PDF (priority 1)
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority)
VALUES
  ('EMPIRE', 'transfer_policy', 'https://www.sunyempire.edu/admissions/transfer-students/', 1),
  ('EMPIRE', 'catalog_pdf', 'https://www.sunyempire.edu/media/13661/bachelors-degree-bulletin.pdf', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = 1, page_type = EXCLUDED.page_type;

-- WALDEN: Add prior learning cap page as prove-it template
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority)
VALUES
  ('WALDEN', 'transfer_policy', 'https://academicguides.waldenu.edu/ld.php?content_id=52993025', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = 1, page_type = EXCLUDED.page_type;

-- CAPELLA: Add catalog transfer credit page (known working)
-- First demote the 404 PDF URLs
UPDATE scrape_url_templates SET priority = 9
WHERE institution_code = 'CAPELLA'
  AND url LIKE '%content/dam/capella/PDF%';

-- Add working catalog transfer credit page
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority)
VALUES
  ('CAPELLA', 'transfer_policy', 'https://www.capella.edu/online-degrees/transfer-credit/', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = 1, page_type = EXCLUDED.page_type;
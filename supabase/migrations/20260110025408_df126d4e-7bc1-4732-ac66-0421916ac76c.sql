-- Add verified working URLs for EMPIRE and CAPELLA

-- EMPIRE: Replace marketing pages with actual policy pages
-- Demote existing main-site pages to priority 2 (keep as backup)
UPDATE scrape_url_templates SET priority = 2
WHERE institution_code = 'EMPIRE'
  AND url IN (
    'https://www.sunyempire.edu/admissions/transfer-credit/',
    'https://www.sunyempire.edu/degrees-programs/degree-requirements/'
  );

-- Add verified EMPIRE policy URLs at priority 1
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority)
VALUES
  ('EMPIRE', 'transfer_policy', 'https://sunyempire.edu/policies/transfer-credit-policy.html', 1),
  ('EMPIRE', 'transfer_info', 'https://sunyempire.edu/academics/get-credits/transfer-credits.html', 1),
  ('EMPIRE', 'residency_policy', 'https://sunyempire.edu/policies/graduate-transfer-cross-registration-and-evaluated-credit-policy.html', 1),
  ('EMPIRE', 'registrar', 'https://sunyempire.edu/registrar/transfer-evaluation/', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = EXCLUDED.priority, page_type = EXCLUDED.page_type;

-- CAPELLA: Add verified working policy PDF URLs at priority 1
INSERT INTO scrape_url_templates (institution_code, page_type, url, priority)
VALUES
  ('CAPELLA', 'transfer_policy_pdf', 'https://www.capella.edu/content/dam/capella/PDF/policies/3.04.11.pdf', 1),
  ('CAPELLA', 'catalog_pdf', 'https://www.capella.edu/content/dam/capella/PDF/2024_July_University_Catalog.pdf', 1)
ON CONFLICT (institution_code, url) DO UPDATE SET priority = EXCLUDED.priority, page_type = EXCLUDED.page_type;
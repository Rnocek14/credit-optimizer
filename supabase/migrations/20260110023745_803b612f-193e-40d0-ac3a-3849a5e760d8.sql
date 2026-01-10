-- Update EMPIRE main-site URLs to priority 1 (they should be primary now that catalog subdomain is demoted)
UPDATE scrape_url_templates
SET priority = 1
WHERE institution_code = 'EMPIRE'
  AND url IN (
    'https://www.sunyempire.edu/admissions/transfer-credit/',
    'https://www.sunyempire.edu/degrees-programs/degree-requirements/'
  );

-- Demote WALDEN catalog.waldenu.edu content.php URLs to priority 9 (JS-heavy, now replaced by handbook)
UPDATE scrape_url_templates
SET priority = 9
WHERE institution_code = 'WALDEN'
  AND url ILIKE '%catalog.waldenu.edu/content.php%';
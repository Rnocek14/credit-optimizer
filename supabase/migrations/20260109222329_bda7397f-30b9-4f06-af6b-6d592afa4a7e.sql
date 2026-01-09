-- Demote blocked SmartCatalog/JS-heavy URLs to priority 9 (preserves history, stops scanning)

-- CAPELLA: demote SmartCatalog / content.php style URLs (often JS-heavy)
UPDATE scrape_url_templates
SET priority = 9
WHERE institution_code = 'CAPELLA'
  AND (
    url ILIKE '%smartcatalog%'
    OR url ILIKE '%content.php?%'
    OR url ILIKE '%catoid=%'
  );

-- EMPIRE: demote catalog pages that diagnostics show as too_short/blocked
UPDATE scrape_url_templates
SET priority = 9
WHERE institution_code = 'EMPIRE'
  AND (
    url ILIKE '%catalog.sunyempire.edu%'
    OR url ILIKE '%smartcatalog%'
    OR url ILIKE '%content.php?%'
  );

-- WALDEN: demote marketing-y transfer pages (we want policies/catalog sections)
UPDATE scrape_url_templates
SET priority = 9
WHERE institution_code = 'WALDEN'
  AND (
    url ILIKE '%admission%'
    OR url ILIKE '%how-to-transfer%'
    OR url ILIKE '%transfer-information%'
    OR url ILIKE '%transfer-credits%'
  );
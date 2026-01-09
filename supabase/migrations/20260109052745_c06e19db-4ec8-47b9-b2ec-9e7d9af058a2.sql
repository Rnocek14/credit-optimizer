-- Update COSC URL templates with correct current paths
UPDATE scrape_url_templates
SET url = 'https://www.charteroak.edu/catalog/current/undergraduate-degree-requirements/ug_academic_residency_requirements.php'
WHERE institution_code = 'COSC' AND page_type = 'residency';

UPDATE scrape_url_templates
SET url = 'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php'
WHERE institution_code = 'COSC' AND page_type = 'transfer_policy';

-- Keep the catalog root but update just in case (it seems to work)
UPDATE scrape_url_templates
SET url = 'https://www.charteroak.edu/catalog/current/'
WHERE institution_code = 'COSC' AND page_type = 'catalog';
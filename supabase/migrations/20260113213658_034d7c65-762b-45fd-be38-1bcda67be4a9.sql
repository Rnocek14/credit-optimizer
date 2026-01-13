-- Update TESU program catalog URL to the working SmartCatalog page
UPDATE scrape_url_templates 
SET url = 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/degree-programs-and-certificates/overview/',
    notes = 'SmartCatalog program overview - lists all undergrad programs'
WHERE institution_code = 'TESU' 
  AND page_type = 'program_catalog';
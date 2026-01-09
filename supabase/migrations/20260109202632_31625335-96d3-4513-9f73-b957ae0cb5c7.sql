-- Replace the blocked catalog.umgc.edu URL with an accessible alternative
UPDATE scrape_url_templates 
SET url = 'https://www.umgc.edu/current-students/learning-resources/undergraduate-academic-requirements'
WHERE institution_code = 'UMGC' 
  AND url = 'https://catalog.umgc.edu/undergraduate-catalog/academic-requirements-policies';
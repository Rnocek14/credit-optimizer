-- Add 'tuition' to allowed source_types, then fix TESU page
ALTER TABLE scrape_url_templates 
DROP CONSTRAINT scrape_url_templates_source_type_check;

ALTER TABLE scrape_url_templates 
ADD CONSTRAINT scrape_url_templates_source_type_check 
CHECK (source_type = ANY (ARRAY['transfer_policy', 'catalog', 'residency', 'alt_credit', 'equivalency_table', 'tuition', 'other']));

-- Now fix TESU tuition page
UPDATE scrape_url_templates 
SET source_type = 'tuition' 
WHERE institution_code = 'TESU' 
AND page_type = 'tuition';
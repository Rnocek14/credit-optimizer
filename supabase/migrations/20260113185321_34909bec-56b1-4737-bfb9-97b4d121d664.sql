-- Fix: Add program_catalog URLs with valid source_type values
-- First, alter the check constraint to include 'program_catalog' as a valid source_type
ALTER TABLE scrape_url_templates DROP CONSTRAINT IF EXISTS scrape_url_templates_source_type_check;

ALTER TABLE scrape_url_templates ADD CONSTRAINT scrape_url_templates_source_type_check 
  CHECK (source_type = ANY (ARRAY[
    'transfer_policy', 'catalog', 'residency', 'alt_credit', 
    'equivalency_table', 'tuition', 'other', 'program_catalog'
  ]));

-- Now insert the program catalog URLs
INSERT INTO scrape_url_templates (institution_code, url, page_type, priority, status, source_type, notes) VALUES
  ('TESU', 'https://www.tesu.edu/academics/programs', 'program_catalog', 100, 'active', 'program_catalog', 'Official catalog program listing'),
  ('COSC', 'https://www.charteroak.edu/programs/', 'program_catalog', 100, 'active', 'program_catalog', 'Official catalog program listing'),
  ('EXCELSIOR', 'https://www.excelsior.edu/programs/', 'program_catalog', 100, 'active', 'program_catalog', 'Official catalog program listing'),
  ('WGU', 'https://www.wgu.edu/online-degree-programs.html', 'program_catalog', 100, 'active', 'program_catalog', 'Program listing - drill to catalog pages'),
  ('UMGC', 'https://www.umgc.edu/academic-programs/bachelors-degrees', 'program_catalog', 100, 'active', 'program_catalog', 'Official bachelor degrees listing'),
  ('SNHU', 'https://www.snhu.edu/online-degrees', 'program_catalog', 100, 'active', 'program_catalog', 'Program listing - drill to catalog pages'),
  ('PURDUE_GLOBAL', 'https://www.purdueglobal.edu/degree-programs/bachelors/', 'program_catalog', 100, 'active', 'program_catalog', 'Official bachelor programs listing')
ON CONFLICT (institution_code, url) DO UPDATE SET
  page_type = EXCLUDED.page_type,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  source_type = EXCLUDED.source_type,
  notes = EXCLUDED.notes;
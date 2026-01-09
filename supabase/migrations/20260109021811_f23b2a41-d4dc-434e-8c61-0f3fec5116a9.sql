-- Update the scrape_method check constraint to include 'firecrawl'
ALTER TABLE scrape_jobs DROP CONSTRAINT scrape_jobs_scrape_method_check;

ALTER TABLE scrape_jobs ADD CONSTRAINT scrape_jobs_scrape_method_check 
  CHECK (scrape_method = ANY (ARRAY['html'::text, 'manual'::text, 'firecrawl'::text]));
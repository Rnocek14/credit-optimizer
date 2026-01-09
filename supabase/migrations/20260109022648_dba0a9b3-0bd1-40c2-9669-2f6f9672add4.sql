-- Enhancement 1 & 3: Add columns for multi-source merge and URL tracking

-- Add merge tracking to institution_policy_packs
ALTER TABLE institution_policy_packs 
  ADD COLUMN IF NOT EXISTS merged_from_job_ids UUID[] DEFAULT '{}';

-- Add merge group to scrape_jobs  
ALTER TABLE scrape_jobs 
  ADD COLUMN IF NOT EXISTS merge_group_id UUID;

-- Update last_scraped_at on scrape_url_templates (if it doesn't exist)
ALTER TABLE scrape_url_templates 
  ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

-- Add index for faster merge group queries
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_merge_group ON scrape_jobs(merge_group_id) WHERE merge_group_id IS NOT NULL;

-- Add index for review queue (draft policy packs by institution)
CREATE INDEX IF NOT EXISTS idx_policy_packs_review_queue ON institution_policy_packs(institution, status, updated_at DESC) WHERE status = 'draft';
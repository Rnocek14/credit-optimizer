-- Clean up duplicate cost snapshots (keep latest)
DELETE FROM template_cost_snapshots a
USING template_cost_snapshots b
WHERE a.template_id = b.template_id 
  AND a.computed_at < b.computed_at;

-- Add unique constraint to prevent future duplicates
ALTER TABLE template_cost_snapshots
ADD CONSTRAINT unique_template_cost UNIQUE (template_id);
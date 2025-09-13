-- Add slug column to requirement_blocks for reliable matching
ALTER TABLE requirement_blocks ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Generate slugs from existing titles
UPDATE requirement_blocks
SET slug = lower(regexp_replace(title, '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS requirement_blocks_slug_idx ON requirement_blocks(slug);
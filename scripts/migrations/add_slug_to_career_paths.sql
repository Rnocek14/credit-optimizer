-- =====================================================
-- Add slug column to career_paths table
-- =====================================================

-- Add slug column if it doesn't exist
ALTER TABLE career_paths 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs from existing titles
UPDATE career_paths 
SET slug = LOWER(
  TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  )
)
WHERE slug IS NULL;

-- Add unique constraint on slug (optional but recommended for SEO)
-- ALTER TABLE career_paths ADD CONSTRAINT career_paths_slug_unique UNIQUE (slug);

-- Verify the migration
SELECT id, title, slug FROM career_paths ORDER BY title;


BEGIN;

-- 1) Backup current data (one-time per date tag)
CREATE TABLE IF NOT EXISTS career_tracks_backup_20250821 AS
SELECT * FROM career_tracks;

-- 2) Ensure unaccent extension exists (for slugify)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 3) Add slug column if missing
ALTER TABLE career_tracks
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 4) Populate slug from title where missing/empty
UPDATE career_tracks
SET slug = NULLIF(regexp_replace(lower(unaccent(title)), '[^a-z0-9]+', '-', 'g'), '')
WHERE slug IS NULL OR slug = '';

-- Fallback for any remaining empty slugs (ensure non-empty)
UPDATE career_tracks
SET slug = 'track-' || LEFT(id::text, 8)
WHERE slug IS NULL OR slug = '';

-- 5) Deduplicate slugs per (user_id, slug) by stable order
WITH ranked AS (
  SELECT
    id,
    user_id,
    slug,
    row_number() OVER (PARTITION BY user_id, slug ORDER BY created_at, id) AS rn
  FROM career_tracks
)
UPDATE career_tracks ct
SET slug = ct.slug || '-' || r.rn
FROM ranked r
WHERE ct.id = r.id
  AND r.rn > 1;

-- 6) Drop legacy title unique index if present (so titles can be reused)
DROP INDEX IF EXISTS uniq_user_track_title;

-- 7) Enforce uniqueness on (user_id, slug)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_track_slug
  ON career_tracks (user_id, slug);

COMMIT;

-- 8) Optional diagnostics (safe to run; returns rows if any duplicates remain)
-- Duplicates by (user_id, slug) after migration: expect zero rows
WITH d AS (
  SELECT user_id, slug, COUNT(*) c
  FROM career_tracks
  GROUP BY user_id, slug
  HAVING COUNT(*) > 1
)
SELECT * FROM d;

-- 9) Optional ownership audit (read-only helpers)
-- Replace with your active dev user id if different
-- SELECT id, title, user_id, created_at
-- FROM career_tracks
-- WHERE user_id <> '2b458624-d498-4cca-a63d-9341cc20e363'
-- ORDER BY created_at;

-- If you later choose to normalize ownership for demo data, run a targeted UPDATE:
-- UPDATE career_tracks
-- SET user_id = '2b458624-d498-4cca-a63d-9341cc20e363'
-- WHERE id IN ('<TRACK_ID_1>', '<TRACK_ID_2>');

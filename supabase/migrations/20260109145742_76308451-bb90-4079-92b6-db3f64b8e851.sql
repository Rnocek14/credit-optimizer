
-- =====================================================
-- PHASE 1: TRANSFER SCRAPER SCALING INFRASTRUCTURE
-- Adds tiers, pack scope, evidence-first verification
-- =====================================================

-- A) institutions: add institution_tier + discovery metadata
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS institution_tier TEXT DEFAULT 'tier_c',
  ADD COLUMN IF NOT EXISTS discovery_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS catalog_base_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Tier constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institutions_institution_tier_check'
  ) THEN
    ALTER TABLE institutions
      ADD CONSTRAINT institutions_institution_tier_check
      CHECK (institution_tier IN ('tier_a', 'tier_b', 'tier_c'));
  END IF;
END$$;

-- Discovery status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institutions_discovery_status_check'
  ) THEN
    ALTER TABLE institutions
      ADD CONSTRAINT institutions_discovery_status_check
      CHECK (discovery_status IN ('pending', 'templates_ready', 'gt_verified', 'active'));
  END IF;
END$$;

-- B) institution_policy_packs: add pack_scope
ALTER TABLE institution_policy_packs
  ADD COLUMN IF NOT EXISTS pack_scope TEXT DEFAULT 'institution';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institution_policy_packs_pack_scope_check'
  ) THEN
    ALTER TABLE institution_policy_packs
      ADD CONSTRAINT institution_policy_packs_pack_scope_check
      CHECK (pack_scope IN ('institution', 'program', 'degree_catalog'));
  END IF;
END$$;

-- Index for dashboard filtering
CREATE INDEX IF NOT EXISTS idx_policy_packs_scope ON institution_policy_packs(pack_scope);

-- C) policy_scan_findings: evidence-first verification fields
ALTER TABLE policy_scan_findings
  ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS extracted_values JSONB,
  ADD COLUMN IF NOT EXISTS verified_values JSONB,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Index for verification queue
CREATE INDEX IF NOT EXISTS idx_findings_requires_verification 
  ON policy_scan_findings(requires_verification) 
  WHERE requires_verification = true;

-- D) Seed 20 Tier-A adult-friendly institutions
INSERT INTO institutions (code, name, type, institution_tier, discovery_status, catalog_base_url, admin_notes, transfer_policy_scope)
VALUES
  ('TESU', 'Thomas Edison State University', 'university', 'tier_a', 'pending', 'https://www.tesu.edu', 'Anchor degree completion school', 'institution'),
  ('EXCEL', 'Excelsior University', 'university', 'tier_a', 'pending', 'https://www.excelsior.edu', 'Often has clear transfer caps', 'institution'),
  ('SNHU', 'Southern New Hampshire University', 'university', 'tier_a', 'pending', 'https://www.snhu.edu', NULL, 'institution'),
  ('UMGC', 'University of Maryland Global Campus', 'university', 'tier_a', 'pending', 'https://www.umgc.edu', NULL, 'institution'),
  ('PURDUEG', 'Purdue Global', 'university', 'tier_a', 'pending', 'https://www.purdueglobal.edu', NULL, 'institution'),
  ('ASUO', 'Arizona State University Online', 'university', 'tier_a', 'pending', 'https://asuonline.asu.edu', NULL, 'institution'),
  ('PSUWC', 'Penn State World Campus', 'university', 'tier_a', 'pending', 'https://www.worldcampus.psu.edu', NULL, 'institution'),
  ('CSUG', 'Colorado State University Global', 'university', 'tier_a', 'pending', 'https://csuglobal.edu', NULL, 'institution'),
  ('CAPELLA', 'Capella University', 'university', 'tier_a', 'pending', 'https://www.capella.edu', NULL, 'institution'),
  ('WALDEN', 'Walden University', 'university', 'tier_a', 'pending', 'https://www.waldenu.edu', NULL, 'institution'),
  ('STRAYER', 'Strayer University', 'university', 'tier_a', 'pending', 'https://www.strayer.edu', NULL, 'institution'),
  ('GCU', 'Grand Canyon University', 'university', 'tier_a', 'pending', 'https://www.gcu.edu', NULL, 'institution'),
  ('PHOENIX', 'University of Phoenix', 'university', 'tier_a', 'pending', 'https://www.phoenix.edu', NULL, 'institution'),
  ('NU', 'National University', 'university', 'tier_a', 'pending', 'https://www.nu.edu', NULL, 'institution'),
  ('FRANKLIN', 'Franklin University', 'university', 'tier_a', 'pending', 'https://www.franklin.edu', NULL, 'institution'),
  ('UPEOPLE', 'University of the People', 'university', 'tier_a', 'pending', 'https://www.uopeople.edu', NULL, 'institution'),
  ('LIBERTY', 'Liberty University Online', 'university', 'tier_a', 'pending', 'https://www.liberty.edu', NULL, 'institution'),
  ('UWFO', 'University of Wisconsin Flexible Option', 'university', 'tier_a', 'pending', 'https://flex.wisconsin.edu', NULL, 'institution'),
  ('WCU', 'Western Carolina University', 'university', 'tier_a', 'pending', 'https://www.wcu.edu', NULL, 'institution'),
  ('EMPIRE', 'SUNY Empire State College', 'university', 'tier_a', 'pending', 'https://www.esc.edu', 'Strong prior learning assessment', 'institution')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  institution_tier = EXCLUDED.institution_tier,
  discovery_status = EXCLUDED.discovery_status,
  catalog_base_url = EXCLUDED.catalog_base_url,
  admin_notes = COALESCE(EXCLUDED.admin_notes, institutions.admin_notes);

-- E) Update existing institutions to tier_a
UPDATE institutions SET institution_tier = 'tier_a', discovery_status = 'active' WHERE code = 'COSC';
UPDATE institutions SET institution_tier = 'tier_a' WHERE code = 'WGU';

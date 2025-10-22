import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, json, serverError, success } from '../_shared/responseHelpers.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if migrations already applied
    const { data: checkData } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'credit_transfer_rules' 
        AND column_name = 'source_course_code'
      `
    });

    if (checkData && checkData.length > 0) {
      return json(200, { 
        message: 'Migrations already applied', 
        alreadyApplied: true 
      });
    }

    // Create exec_sql function if needed
    try {
      await supabaseAdmin.rpc('exec_sql', {
        query: `
          CREATE OR REPLACE FUNCTION exec_sql(query text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result json;
          BEGIN
            EXECUTE query;
            RETURN '{"success": true}'::json;
          EXCEPTION
            WHEN OTHERS THEN
              RETURN json_build_object('error', SQLERRM);
          END;
          $$;
        `
      });
    } catch (e) {
      // Function likely already exists, continue
    }

    const migrations = [
      {
        name: 'enhance_credit_transfer_rules',
        sql: `
-- Add course-level transfer tracking
ALTER TABLE credit_transfer_rules
  ADD COLUMN IF NOT EXISTS source_course_code TEXT,
  ADD COLUMN IF NOT EXISTS target_course_code TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT CHECK (acceptance_status IN ('accepted', 'elective', 'rejected')),
  ADD COLUMN IF NOT EXISTS confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS precedence SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE;

-- Uppercase constraint
ALTER TABLE credit_transfer_rules
  DROP CONSTRAINT IF EXISTS chk_institutions_upper;
  
ALTER TABLE credit_transfer_rules
  ADD CONSTRAINT chk_institutions_upper 
  CHECK (
    source_institution = UPPER(source_institution) AND
    target_institution = UPPER(target_institution)
  );

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfer_rule_lookup
  ON credit_transfer_rules(source_institution, source_course_code, target_institution)
  WHERE source_course_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfer_badge
  ON credit_transfer_rules(source_institution, source_course_code, target_institution, acceptance_status);
        `
      },
      {
        name: 'add_provider_codes',
        sql: `
-- Add provider_code column
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS provider_code TEXT;

-- Backfill known providers
UPDATE providers SET provider_code = 'TESU' WHERE name ILIKE '%thomas edison%';
UPDATE providers SET provider_code = 'WGU' WHERE name ILIKE '%western governors%';
UPDATE providers SET provider_code = 'COSC' WHERE name ILIKE '%charter oak%';
UPDATE providers SET provider_code = 'EXCU' WHERE name ILIKE '%excelsior%';
UPDATE providers SET provider_code = 'SOPHIA' WHERE name ILIKE '%sophia%';
UPDATE providers SET provider_code = 'STUDY' WHERE name ILIKE '%study.com%';
UPDATE providers SET provider_code = 'CLEP' WHERE name ILIKE '%clep%';
UPDATE providers SET provider_code = 'DSST' WHERE name ILIKE '%dsst%';
UPDATE providers SET provider_code = 'COUR' WHERE name ILIKE '%coursera%';
UPDATE providers SET provider_code = 'EDX' WHERE name ILIKE '%edx%';

-- Fallback for unmapped
UPDATE providers 
SET provider_code = UPPER(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'))
WHERE provider_code IS NULL;

-- Make NOT NULL and unique
ALTER TABLE providers
  ALTER COLUMN provider_code SET NOT NULL,
  ADD CONSTRAINT providers_code_unique UNIQUE(provider_code);

CREATE INDEX IF NOT EXISTS idx_providers_code ON providers(provider_code);
        `
      },
      {
        name: 'canonical_requirement_catalog',
        sql: `
-- Canonical requirement codes
CREATE TABLE IF NOT EXISTS requirement_catalog (
  canon_req_code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  area TEXT,
  level_hint TEXT,
  credits_typical SMALLINT
);

-- Map marketplace courses to canonical requirements
CREATE TABLE IF NOT EXISTS canonical_requirement_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_course_id UUID REFERENCES marketplace_courses(id) ON DELETE CASCADE,
  canon_req_code TEXT REFERENCES requirement_catalog(canon_req_code),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  UNIQUE(marketplace_course_id, canon_req_code)
);

-- Add canon_req_code to program_requirements
ALTER TABLE program_requirements
  ADD COLUMN IF NOT EXISTS canon_req_code TEXT REFERENCES requirement_catalog(canon_req_code);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canon_map_course ON canonical_requirement_map(marketplace_course_id);
CREATE INDEX IF NOT EXISTS idx_canon_map_req ON canonical_requirement_map(canon_req_code);
CREATE INDEX IF NOT EXISTS idx_program_req_canon ON program_requirements(canon_req_code);
        `
      },
      {
        name: 'option_exclusions',
        sql: `
-- Prevent duplicate credit (e.g., CLEP + Sophia Algebra)
CREATE TABLE IF NOT EXISTS option_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_a_id UUID NOT NULL,
  option_b_id UUID NOT NULL,
  reason TEXT,
  CHECK (option_a_id < option_b_id),
  UNIQUE(option_a_id, option_b_id)
);

CREATE INDEX IF NOT EXISTS idx_exclusions_a ON option_exclusions(option_a_id);
CREATE INDEX IF NOT EXISTS idx_exclusions_b ON option_exclusions(option_b_id);
        `
      },
      {
        name: 'partner_policy_enhancements',
        sql: `
-- Add policy versioning and granularity
ALTER TABLE partner_policies
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'institution' CHECK (scope IN ('institution', 'program')),
  ADD COLUMN IF NOT EXISTS program_code TEXT,
  ADD COLUMN IF NOT EXISTS max_alt_in_major SMALLINT,
  ADD COLUMN IF NOT EXISTS free_elective_cap SMALLINT,
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE;

-- Index for active policies
CREATE INDEX IF NOT EXISTS idx_active_policies
  ON partner_policies(partner_code, effective_from, effective_to)
  WHERE effective_to IS NULL OR effective_to > CURRENT_DATE;
        `
      },
      {
        name: 'rls_for_new_tables',
        sql: `
-- Enable RLS
ALTER TABLE requirement_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_requirement_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_exclusions ENABLE ROW LEVEL SECURITY;

-- Public read policies
DROP POLICY IF EXISTS "Public read requirement_catalog" ON requirement_catalog;
CREATE POLICY "Public read requirement_catalog" ON requirement_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read canonical_requirement_map" ON canonical_requirement_map;
CREATE POLICY "Public read canonical_requirement_map" ON canonical_requirement_map FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read option_exclusions" ON option_exclusions;
CREATE POLICY "Public read option_exclusions" ON option_exclusions FOR SELECT USING (true);

-- Service role policies
DROP POLICY IF EXISTS "Service role all requirement_catalog" ON requirement_catalog;
CREATE POLICY "Service role all requirement_catalog" ON requirement_catalog FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role all canonical_requirement_map" ON canonical_requirement_map;
CREATE POLICY "Service role all canonical_requirement_map" ON canonical_requirement_map FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role all option_exclusions" ON option_exclusions;
CREATE POLICY "Service role all option_exclusions" ON option_exclusions FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');
        `
      }
    ];

    const results = [];
    
    for (const migration of migrations) {
      console.log(`Applying migration: ${migration.name}`);
      const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: migration.sql });
      
      if (error) {
        console.error(`Migration ${migration.name} failed:`, error);
        return json(500, { 
          error: 'migration_failed', 
          message: `Failed at ${migration.name}`, 
          details: error 
        });
      }
      
      results.push({ name: migration.name, success: true });
    }

    console.log('All migrations applied successfully');
    return success({ 
      message: `✅ Migrations applied: ${results.length}/${migrations.length}`, 
      results 
    });

  } catch (error) {
    console.error('Migration error:', error);
    return serverError(error);
  }
});

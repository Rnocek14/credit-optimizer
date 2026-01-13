-- ============================================================================
-- Program Catalog Pipeline: Discovery → Requirements → Template Generation
-- ============================================================================

-- 1. Supported Program Families (defines "target universe")
CREATE TABLE IF NOT EXISTS supported_program_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  priority_score INTEGER DEFAULT 50,
  alt_credit_friendly BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial families
INSERT INTO supported_program_families (family_code, display_name, priority_score, alt_credit_friendly, notes) VALUES
  ('BUS_ADMIN', 'Business Administration', 100, true, 'High demand, excellent alt-credit coverage'),
  ('GEN_STUDIES', 'General Studies / Liberal Arts', 95, true, 'Maximum flexibility for transfers'),
  ('CS_IT', 'Computer Science / IT', 90, true, 'Tech-focused, good Study.com coverage'),
  ('PSYCHOLOGY', 'Psychology', 80, true, 'Popular program, good gen-ed overlap'),
  ('CRIMINAL_JUSTICE', 'Criminal Justice', 75, true, 'Strong alt-credit options'),
  ('HEALTHCARE_ADMIN', 'Healthcare Administration', 70, true, 'Non-clinical healthcare path'),
  ('CYBERSECURITY', 'Cybersecurity', 85, true, 'High demand tech specialty'),
  ('ACCOUNTING', 'Accounting', 75, true, 'CPA track variant possible'),
  ('COMMUNICATIONS', 'Communications', 60, true, 'Broad applicability'),
  ('EDUCATION', 'Education', 50, false, 'Often licensure-blocked, state-specific'),
  ('NURSING', 'Nursing (RN-BSN)', 40, false, 'Clinical requirements, licensure'),
  ('SOCIAL_WORK', 'Social Work', 45, false, 'Often requires field placements')
ON CONFLICT (family_code) DO NOTHING;

-- 2. Program Catalog Runs (provenance tracking)
CREATE TABLE IF NOT EXISTS program_catalog_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_code TEXT NOT NULL,
  seed_url TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','partial')),
  crawler_version TEXT,
  model_version TEXT,
  programs_discovered INTEGER DEFAULT 0,
  programs_new INTEGER DEFAULT 0,
  programs_updated INTEGER DEFAULT 0,
  diff_summary JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_catalog_runs_institution ON program_catalog_runs(institution_code);
CREATE INDEX IF NOT EXISTS idx_program_catalog_runs_status ON program_catalog_runs(status);

-- 3. Program Catalog (discovered programs with stable identifiers)
CREATE TABLE IF NOT EXISTS program_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug TEXT NOT NULL UNIQUE,
  program_code_raw TEXT,
  institution_code TEXT NOT NULL,
  degree_level TEXT NOT NULL CHECK (degree_level IN ('associate','bachelor','master','certificate')),
  degree_type TEXT,
  program_name_raw TEXT NOT NULL,
  program_name_normalized TEXT,
  major_or_concentration TEXT,
  catalog_url TEXT,
  marketing_url TEXT,
  degree_total_credits INTEGER,
  is_licensure_program BOOLEAN DEFAULT false,
  has_clinical_or_practicum BOOLEAN DEFAULT false,
  delivery_mode TEXT CHECK (delivery_mode IS NULL OR delivery_mode IN ('online','campus','hybrid','unknown')),
  family_code TEXT REFERENCES supported_program_families(family_code),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','discontinued','unknown')),
  first_seen_run_id UUID REFERENCES program_catalog_runs(id),
  last_seen_run_id UUID REFERENCES program_catalog_runs(id),
  scraped_at TIMESTAMPTZ,
  current_requirements_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_catalog_institution ON program_catalog(institution_code);
CREATE INDEX IF NOT EXISTS idx_program_catalog_family ON program_catalog(family_code);
CREATE INDEX IF NOT EXISTS idx_program_catalog_status ON program_catalog(status);
CREATE INDEX IF NOT EXISTS idx_program_catalog_degree_level ON program_catalog(degree_level);

-- 4. Program Requirements Versions
CREATE TABLE IF NOT EXISTS program_requirements_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_catalog_id UUID NOT NULL REFERENCES program_catalog(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  effective_term TEXT,
  extracted_json JSONB NOT NULL,
  credits_total INTEGER,
  gen_ed_credits INTEGER,
  major_core_credits INTEGER,
  elective_credits INTEGER,
  residency_min INTEGER,
  transfer_max INTEGER,
  alt_credit_cap INTEGER,
  capstone_required BOOLEAN,
  raw_snapshot_id UUID REFERENCES scraped_content(id),
  source_urls TEXT[],
  extraction_source_type TEXT CHECK (extraction_source_type IS NULL OR extraction_source_type IN ('catalog_html','catalog_pdf','marketing_html','mixed')),
  extraction_prompt_version TEXT,
  extraction_model TEXT,
  confidence NUMERIC(3,2),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_catalog_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_program_req_versions_program ON program_requirements_versions(program_catalog_id);
CREATE INDEX IF NOT EXISTS idx_program_req_versions_hash ON program_requirements_versions(content_hash);

-- Add current_requirements FK after table exists
ALTER TABLE program_catalog 
ADD CONSTRAINT program_catalog_current_requirements_version_id_fkey 
FOREIGN KEY (current_requirements_version_id) REFERENCES program_requirements_versions(id);

-- 5. Template Eligibility Status Type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_eligibility_status') THEN
    CREATE TYPE template_eligibility_status AS ENUM (
      'eligible',
      'blocked_licensure',
      'blocked_clinical',
      'blocked_missing_requirements',
      'blocked_unsupported_family',
      'blocked_non_bachelor',
      'needs_review',
      'pending_extraction'
    );
  END IF;
END $$;

-- 6. Template Generation Queue
CREATE TABLE IF NOT EXISTS template_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_catalog_id UUID NOT NULL REFERENCES program_catalog(id) ON DELETE CASCADE,
  program_slug TEXT NOT NULL,
  eligibility_status template_eligibility_status NOT NULL DEFAULT 'pending_extraction',
  blocked_reasons TEXT[],
  desired_tracks TEXT[] DEFAULT ARRAY['standard', 'alt_max'],
  priority_score INTEGER DEFAULT 50,
  last_attempt_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','blocked')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_catalog_id)
);

CREATE INDEX IF NOT EXISTS idx_template_queue_status ON template_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_template_queue_eligibility ON template_generation_queue(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_template_queue_priority ON template_generation_queue(priority_score DESC);

-- 7. Template Generation Queue Tracks (per-track status)
CREATE TABLE IF NOT EXISTS template_generation_queue_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES template_generation_queue(id) ON DELETE CASCADE,
  track_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  template_id TEXT,
  last_error TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(queue_id, track_type)
);

-- 8. Add linkage columns to degree_templates
ALTER TABLE degree_templates ADD COLUMN IF NOT EXISTS program_catalog_id UUID REFERENCES program_catalog(id);
ALTER TABLE degree_templates ADD COLUMN IF NOT EXISTS program_slug TEXT;
ALTER TABLE degree_templates ADD COLUMN IF NOT EXISTS degree_total_credits INTEGER;

CREATE INDEX IF NOT EXISTS idx_degree_templates_program_slug ON degree_templates(program_slug);
CREATE INDEX IF NOT EXISTS idx_degree_templates_program_catalog_id ON degree_templates(program_catalog_id);

-- 9. Program Slug History (for tracking renames)
CREATE TABLE IF NOT EXISTS program_slug_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program_catalog(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  new_slug TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_program_slug_history_old ON program_slug_history(old_slug);

-- 10. Update invoke_edge_function allowlist
CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  p_function_name text,
  p_body jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
  v_project_url text := 'https://vzpissitddpunkpythsb.supabase.co';
  v_service_role_key text;
  v_allowed_functions text[] := ARRAY[
    'evidence-backfill-worker',
    'run-degree-truth-scan',
    'program-inventory-scraper',
    'program-requirements-extractor',
    'template-generator-from-requirements'
  ];
  v_request_id bigint;
BEGIN
  IF NOT (p_function_name = ANY(v_allowed_functions)) THEN
    RAISE EXCEPTION 'invoke_edge_function: function "%" not in allowlist', p_function_name;
  END IF;

  SELECT ds.decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'service_role_key'
  LIMIT 1;
  
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE EXCEPTION 'invoke_edge_function: missing service_role_key in vault';
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/' || p_function_name,
    body := p_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    )
  ) INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- 11. Cron Wrapper: Program Catalog Refresh
CREATE OR REPLACE FUNCTION util.run_program_catalog_refresh(
  p_institution_code text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  got_lock boolean;
  v_request_id bigint;
BEGIN
  got_lock := pg_try_advisory_lock(8675311);
  IF NOT got_lock THEN
    RAISE NOTICE 'program-catalog-refresh: skipped (lock held)';
    RETURN NULL;
  END IF;

  BEGIN
    v_request_id := util.invoke_edge_function(
      p_function_name => 'program-inventory-scraper',
      p_body => jsonb_build_object('institution_code', p_institution_code)
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(8675311);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(8675311);
  RETURN v_request_id;
END;
$$;

-- 12. Cron Wrapper: Requirements Extraction
CREATE OR REPLACE FUNCTION util.run_program_requirements_extractor(
  p_batch_size integer DEFAULT 10
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  got_lock boolean;
  v_request_id bigint;
BEGIN
  got_lock := pg_try_advisory_lock(8675312);
  IF NOT got_lock THEN
    RAISE NOTICE 'program-requirements-extractor: skipped (lock held)';
    RETURN NULL;
  END IF;

  BEGIN
    v_request_id := util.invoke_edge_function(
      p_function_name => 'program-requirements-extractor',
      p_body => jsonb_build_object('batch_size', p_batch_size)
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(8675312);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(8675312);
  RETURN v_request_id;
END;
$$;

-- 13. Cron Wrapper: Template Generation
CREATE OR REPLACE FUNCTION util.run_template_generator(
  p_batch_size integer DEFAULT 5
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  got_lock boolean;
  v_request_id bigint;
BEGIN
  got_lock := pg_try_advisory_lock(8675313);
  IF NOT got_lock THEN
    RAISE NOTICE 'template-generator: skipped (lock held)';
    RETURN NULL;
  END IF;

  BEGIN
    v_request_id := util.invoke_edge_function(
      p_function_name => 'template-generator-from-requirements',
      p_body => jsonb_build_object('batch_size', p_batch_size)
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(8675313);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(8675313);
  RETURN v_request_id;
END;
$$;

-- 14. RLS Policies
ALTER TABLE program_catalog_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_requirements_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_generation_queue_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_slug_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_program_families ENABLE ROW LEVEL SECURITY;

-- Service role policies (allows edge functions to operate)
CREATE POLICY "Service role full access" ON program_catalog_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON program_catalog FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON program_requirements_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON template_generation_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON template_generation_queue_tracks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON program_slug_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON supported_program_families FOR ALL USING (true) WITH CHECK (true);

-- 15. Pipeline Health View
CREATE OR REPLACE VIEW program_pipeline_health_v AS
SELECT
  (SELECT count(*) FROM program_catalog WHERE status = 'active') AS total_programs,
  (SELECT count(*) FROM program_catalog WHERE status = 'active' AND degree_level = 'bachelor') AS bachelor_programs,
  (SELECT count(DISTINCT institution_code) FROM program_catalog) AS institutions_covered,
  (SELECT count(*) FROM program_catalog WHERE current_requirements_version_id IS NOT NULL) AS with_requirements,
  (SELECT count(*) FROM program_requirements_versions) AS total_requirement_versions,
  (SELECT count(*) FROM template_generation_queue WHERE eligibility_status = 'eligible') AS queue_eligible,
  (SELECT count(*) FROM template_generation_queue WHERE eligibility_status::text LIKE 'blocked%') AS queue_blocked,
  (SELECT count(*) FROM template_generation_queue WHERE status = 'queued') AS queue_pending,
  (SELECT count(*) FROM degree_templates WHERE program_catalog_id IS NOT NULL) AS templates_from_pipeline,
  (SELECT count(*) FROM degree_templates) AS total_templates,
  (SELECT max(finished_at) FROM program_catalog_runs WHERE status = 'completed') AS last_catalog_run,
  (SELECT max(created_at) FROM program_requirements_versions) AS last_requirements_extraction;
-- Fix Critical RLS Security Issue: Replace insecure USING(true) policies with service_role restrictions

-- Drop insecure policies on all new tables
DROP POLICY IF EXISTS "Service role full access" ON program_catalog_runs;
DROP POLICY IF EXISTS "Service role full access" ON program_catalog;
DROP POLICY IF EXISTS "Service role full access" ON program_requirements_versions;
DROP POLICY IF EXISTS "Service role full access" ON template_generation_queue;
DROP POLICY IF EXISTS "Service role full access" ON template_generation_queue_tracks;
DROP POLICY IF EXISTS "Service role full access" ON program_slug_history;
DROP POLICY IF EXISTS "Service role full access" ON supported_program_families;

-- Create secure policies (service role only for write operations)
CREATE POLICY "Service role access" ON program_catalog_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON program_catalog FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON program_requirements_versions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON template_generation_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON template_generation_queue_tracks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON program_slug_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- supported_program_families: service role for writes, authenticated for reads (reference data)
CREATE POLICY "Service role write access" ON supported_program_families FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated read access" ON supported_program_families FOR SELECT
  USING (auth.role() = 'authenticated');
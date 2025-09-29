-- Enable RLS on block_requirement_map
ALTER TABLE block_requirement_map ENABLE ROW LEVEL SECURITY;

-- Allow public read access to block mappings
CREATE POLICY "Public read access to block requirement mappings"
  ON block_requirement_map
  FOR SELECT
  USING (true);

-- Service role can manage mappings
CREATE POLICY "Service role can manage block requirement mappings"
  ON block_requirement_map
  FOR ALL
  USING (true)
  WITH CHECK (true);
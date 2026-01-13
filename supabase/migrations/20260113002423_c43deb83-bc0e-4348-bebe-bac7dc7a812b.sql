-- Phase D: Ground Truth Overrides table for admin conflict resolution
-- Stores permanent field-level decisions that override extraction conflicts

CREATE TABLE IF NOT EXISTS public.ground_truth_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution TEXT NOT NULL,
  field_name TEXT NOT NULL,
  academic_year TEXT,
  pack_scope TEXT DEFAULT 'institution',
  
  -- The resolved value
  override_value JSONB NOT NULL,
  
  -- Evidence and audit
  citation_url TEXT,
  note TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Source tracking
  source_run_id UUID,  -- Run where conflict was found
  original_candidates JSONB,  -- Store the conflicting values for audit
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one override per field per institution/year/scope
  CONSTRAINT unique_override_per_field UNIQUE (institution, field_name, academic_year, pack_scope)
);

-- Enable RLS
ALTER TABLE public.ground_truth_overrides ENABLE ROW LEVEL SECURITY;

-- Admin-only write access
CREATE POLICY "Admins can manage ground truth overrides"
  ON public.ground_truth_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Service role can read for merge operations
CREATE POLICY "Service role can read overrides"
  ON public.ground_truth_overrides
  FOR SELECT
  USING (true);

-- Index for fast lookup during merge
CREATE INDEX idx_ground_truth_overrides_lookup 
  ON public.ground_truth_overrides(institution, field_name);

-- Timestamp trigger
CREATE TRIGGER update_ground_truth_overrides_updated_at
  BEFORE UPDATE ON public.ground_truth_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.ground_truth_overrides IS 'Stores admin-resolved values for fields with extraction conflicts';
-- Create workflow_validations table for tracking validation sources
CREATE TABLE public.workflow_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  step_id UUID,
  source_type TEXT NOT NULL CHECK (source_type IN ('maya_decision', 'mentor_review', 'cri_score', 'peer_validation', 'system_auto')),
  source_id UUID,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validation_score NUMERIC NOT NULL DEFAULT 0 CHECK (validation_score >= 0 AND validation_score <= 100),
  validation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  validated_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_validations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own workflow validations" 
ON public.workflow_validations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all workflow validations" 
ON public.workflow_validations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_workflow_validations_user_id ON public.workflow_validations(user_id);
CREATE INDEX idx_workflow_validations_source_type ON public.workflow_validations(source_type);
CREATE INDEX idx_workflow_validations_step_id ON public.workflow_validations(step_id);
CREATE INDEX idx_workflow_validations_active ON public.workflow_validations(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_workflow_validations_updated_at
BEFORE UPDATE ON public.workflow_validations
FOR EACH ROW
EXECUTE FUNCTION public.update_pattern_recognition_updated_at();

-- Create aggregated validation metrics view
CREATE OR REPLACE VIEW public.user_validation_metrics AS
SELECT 
  wv.user_id,
  COUNT(*) as total_validations,
  AVG(wv.validation_score) as avg_validation_score,
  AVG(wv.confidence_score) as avg_confidence_score,
  COUNT(*) FILTER (WHERE wv.validation_score >= 90) as high_score_validations,
  COUNT(*) FILTER (WHERE wv.source_type = 'maya_decision') as maya_validations,
  COUNT(*) FILTER (WHERE wv.source_type = 'mentor_review') as mentor_validations,
  COUNT(*) FILTER (WHERE wv.source_type = 'cri_score') as cri_validations,
  COUNT(*) FILTER (WHERE wv.source_type = 'peer_validation') as peer_validations,
  MAX(wv.created_at) as last_validation_at,
  jsonb_object_agg(wv.source_type, COUNT(*)) as validation_breakdown
FROM public.workflow_validations wv
WHERE wv.is_active = true
GROUP BY wv.user_id;
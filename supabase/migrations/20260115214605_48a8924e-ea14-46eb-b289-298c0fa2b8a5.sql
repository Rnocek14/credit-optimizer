-- Add status and policy_status columns to degree_templates
-- This enables the promotion gate to actually persist template visibility state

-- Add status column with default 'active' for backward compatibility
ALTER TABLE public.degree_templates 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add policy_status column to track the source policy's gate status
ALTER TABLE public.degree_templates 
ADD COLUMN IF NOT EXISTS policy_status text;

-- Add gate_reason column for audit trail (why was this status assigned)
ALTER TABLE public.degree_templates 
ADD COLUMN IF NOT EXISTS gate_reason text;

-- Add constraint to ensure valid status values
ALTER TABLE public.degree_templates 
ADD CONSTRAINT degree_templates_status_check 
CHECK (status IN ('active', 'pending_review', 'blocked', 'archived'));

-- Add constraint for policy_status
ALTER TABLE public.degree_templates 
ADD CONSTRAINT degree_templates_policy_status_check 
CHECK (policy_status IS NULL OR policy_status IN ('green', 'yellow', 'red'));

-- Create index for efficient status filtering (critical for user-facing queries)
CREATE INDEX IF NOT EXISTS idx_degree_templates_status 
ON public.degree_templates(status);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_degree_templates_status_program 
ON public.degree_templates(status, program_code);

COMMENT ON COLUMN public.degree_templates.status IS 
'Template visibility: active (user-visible), pending_review (needs verification), blocked (failed gate), archived (deprecated)';

COMMENT ON COLUMN public.degree_templates.policy_status IS 
'Source policy pack gate status when template was generated: green/yellow/red';

COMMENT ON COLUMN public.degree_templates.gate_reason IS 
'Explanation of why this status was assigned (for audit/debugging)';
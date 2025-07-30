-- Create workflow certificates table
CREATE TABLE public.workflow_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workflow_id UUID NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  verification_code TEXT NOT NULL UNIQUE,
  certificate_type TEXT NOT NULL DEFAULT 'maya_certified',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  
  -- Certificate metadata
  workflow_title TEXT NOT NULL,
  workflow_description TEXT,
  completion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  maya_confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  user_feedback_score NUMERIC,
  total_decisions INTEGER NOT NULL DEFAULT 0,
  autonomous_steps INTEGER NOT NULL DEFAULT 0,
  manual_steps INTEGER NOT NULL DEFAULT 0,
  
  -- Certificate data for PDF generation
  certificate_data JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_certificates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage all certificates"
ON public.workflow_certificates
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own certificates"
ON public.workflow_certificates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certificates"
ON public.workflow_certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_workflow_certificates_user_id ON public.workflow_certificates(user_id);
CREATE INDEX idx_workflow_certificates_workflow_id ON public.workflow_certificates(workflow_id);
CREATE INDEX idx_workflow_certificates_verification_code ON public.workflow_certificates(verification_code);
CREATE INDEX idx_workflow_certificates_certificate_number ON public.workflow_certificates(certificate_number);

-- Create trigger for updated_at
CREATE TRIGGER update_workflow_certificates_updated_at
  BEFORE UPDATE ON public.workflow_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cert_number TEXT;
  year_prefix TEXT;
BEGIN
  year_prefix := EXTRACT(YEAR FROM now())::TEXT;
  
  -- Generate format: MAYA-YYYY-XXXXXX (where X is random alphanumeric)
  cert_number := 'MAYA-' || year_prefix || '-' || 
    UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM now())::TEXT),
        1, 6
      )
    );
  
  RETURN cert_number;
END;
$$;

-- Function to generate verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generate 12-character alphanumeric verification code
  RETURN UPPER(
    SUBSTRING(
      MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM now())::TEXT || RANDOM()::TEXT),
      1, 12
    )
  );
END;
$$;
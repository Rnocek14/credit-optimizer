-- Fix function search path security issues
DROP FUNCTION IF EXISTS public.generate_certificate_number();
DROP FUNCTION IF EXISTS public.generate_verification_code();

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
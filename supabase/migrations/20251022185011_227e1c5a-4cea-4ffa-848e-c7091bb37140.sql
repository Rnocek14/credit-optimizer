-- Enable RLS and create policies for foundation data tables

-- Enable RLS on all foundation data tables
ALTER TABLE public.requirement_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transfer_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_exclusions ENABLE ROW LEVEL SECURITY;

-- Requirement Catalog: Public read access
CREATE POLICY "requirement_catalog_public_read"
ON public.requirement_catalog FOR SELECT
TO public
USING (true);

CREATE POLICY "requirement_catalog_service_write"
ON public.requirement_catalog FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Partner Policies: Public read access
CREATE POLICY "partner_policies_public_read"
ON public.partner_policies FOR SELECT
TO public
USING (true);

CREATE POLICY "partner_policies_service_write"
ON public.partner_policies FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Credit Transfer Rules: Public read access
CREATE POLICY "credit_transfer_rules_public_read"
ON public.credit_transfer_rules FOR SELECT
TO public
USING (true);

CREATE POLICY "credit_transfer_rules_service_write"
ON public.credit_transfer_rules FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Option Exclusions: Public read access
CREATE POLICY "option_exclusions_public_read"
ON public.option_exclusions FOR SELECT
TO public
USING (true);

CREATE POLICY "option_exclusions_service_write"
ON public.option_exclusions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
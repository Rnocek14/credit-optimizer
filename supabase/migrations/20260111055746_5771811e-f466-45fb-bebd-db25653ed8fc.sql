-- Allow anonymous read access to institution_policy_packs for the anchor school selector
CREATE POLICY "Allow anonymous read on institution_policy_packs"
ON public.institution_policy_packs
FOR SELECT
USING (true);
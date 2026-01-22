-- Add RLS policy for admin users to insert institutions
-- Admins need to be able to create new institutions via the Add Institution UI

-- Policy for admin INSERT on institutions table
CREATE POLICY "Admins can insert institutions"
ON public.institutions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for admin INSERT on institution_policy_packs table
CREATE POLICY "Admins can insert policy packs"
ON public.institution_policy_packs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for admin UPDATE on institution_policy_packs table  
CREATE POLICY "Admins can update policy packs"
ON public.institution_policy_packs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for admin INSERT on institution_v1_scope (Enable V1 button)
CREATE POLICY "Admins can enable V1 scope"
ON public.institution_v1_scope
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for admin DELETE on institution_v1_scope (Disable V1)
CREATE POLICY "Admins can disable V1 scope"
ON public.institution_v1_scope
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
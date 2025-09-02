
-- Dev-only RLS support for user_alt_course_usage to allow known dev users
-- to manage their own rows even without a Supabase auth session.
-- This does NOT weaken production users' protections and is scoped strictly
-- to the three dev accounts already used elsewhere in this project.

-- Optional: keep as reference of current policies (no changes here)
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_alt_course_usage';

-- 1) Allow dev users to INSERT records for their own user_id AND only for tracks they own
CREATE POLICY "dev_alt_usage_insert"
  ON public.user_alt_course_usage
  FOR INSERT
  TO public
  WITH CHECK (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',  -- Aisha Khan
      '3c459625-e499-5ddb-b64d-a442dd21f474',  -- Mateo Silva
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'   -- Jade Chen
    )
    AND EXISTS (
      SELECT 1
      FROM public.career_tracks ct
      WHERE ct.id = user_alt_course_usage.track_id
        AND ct.user_id = user_alt_course_usage.user_id
    )
  );

-- 2) Allow dev users to READ their own alt course usage
CREATE POLICY "dev_alt_usage_select"
  ON public.user_alt_course_usage
  FOR SELECT
  TO public
  USING (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',  -- Aisha Khan
      '3c459625-e499-5ddb-b64d-a442dd21f474',  -- Mateo Silva
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'   -- Jade Chen
    )
  );

-- 3) Allow dev users to DELETE their own alt course usage
CREATE POLICY "dev_alt_usage_delete"
  ON public.user_alt_course_usage
  FOR DELETE
  TO public
  USING (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',  -- Aisha Khan
      '3c459625-e499-5ddb-b64d-a442dd21f474',  -- Mateo Silva
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'   -- Jade Chen
    )
  );

-- Notes:
-- - Existing policies that require auth.uid() = user_id remain in place for normal authenticated users.
-- - These additional dev policies only help the three dev accounts operate without a JWT in preview/dev flows.

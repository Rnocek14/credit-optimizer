
-- 1) Allow dev users to SELECT and MANAGE their own career tracks
-- This fixes the EXISTS(...) subquery used by the dev insert policy on user_alt_course_usage.
-- It also unblocks track management in dev preview flows.

-- Allow dev users to SELECT their own tracks
CREATE POLICY "dev_tracks_select"
  ON public.career_tracks
  FOR SELECT
  TO public
  USING (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',  -- Aisha Khan
      '3c459625-e499-5ddb-b64d-a442dd21f474',  -- Mateo Silva
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'   -- Jade Chen
    )
  );

-- Allow dev users to manage (ALL) their own tracks
CREATE POLICY "dev_tracks_all"
  ON public.career_tracks
  FOR ALL
  TO public
  USING (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    )
  )
  WITH CHECK (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    )
  );

-- 2) Dev policies for course_progress_track_usage so dev sessions can tag/untag normal courses

-- SELECT own usage
CREATE POLICY "dev_cptu_select"
  ON public.course_progress_track_usage
  FOR SELECT
  TO public
  USING (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    )
  );

-- INSERT own usage, ensure the track belongs to the same user (now that career_tracks SELECT is allowed)
CREATE POLICY "dev_cptu_insert"
  ON public.course_progress_track_usage
  FOR INSERT
  TO public
  WITH CHECK (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    )
    AND EXISTS (
      SELECT 1
      FROM public.career_tracks ct
      WHERE ct.id = course_progress_track_usage.track_id
        AND ct.user_id = course_progress_track_usage.user_id
    )
  );

-- UPDATE own usage
CREATE POLICY "dev_cptu_update"
  ON public.course_progress_track_usage
  FOR UPDATE
  TO public
  USING (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    )
  )
  WITH CHECK (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    )
  );

-- DELETE own usage
CREATE POLICY "dev_cptu_delete"
  ON public.course_progress_track_usage
  FOR DELETE
  TO public
  USING (
    user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    )
  );

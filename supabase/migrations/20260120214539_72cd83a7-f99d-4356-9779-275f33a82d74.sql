-- Add write policies for source_courses and source_course_aliases
-- Allow service role and authenticated users to manage canonical data

-- source_courses write policies
CREATE POLICY "Allow authenticated users to insert source_courses"
  ON public.source_courses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update source_courses"
  ON public.source_courses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- source_course_aliases write policies
CREATE POLICY "Allow authenticated users to insert source_course_aliases"
  ON public.source_course_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update source_course_aliases"
  ON public.source_course_aliases
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anon for seeding via edge functions
CREATE POLICY "Allow anon to insert source_courses"
  ON public.source_courses
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update source_courses"
  ON public.source_courses
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to insert source_course_aliases"
  ON public.source_course_aliases
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update source_course_aliases"
  ON public.source_course_aliases
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
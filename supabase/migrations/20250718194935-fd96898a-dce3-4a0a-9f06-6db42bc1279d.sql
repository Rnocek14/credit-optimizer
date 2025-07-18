-- Enable public viewing of gallery-enabled profiles and resumes
CREATE POLICY "Public can view gallery-enabled profiles" 
ON public.profiles 
FOR SELECT 
USING (gallery_enabled = true AND resume_review_summary IS NOT NULL);

-- Update existing policies to be more specific for authenticated users
DROP POLICY IF EXISTS "Allow service role access to profiles";
CREATE POLICY "Service role full access to profiles" 
ON public.profiles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add policy for users to manage their own profiles
CREATE POLICY "Users can manage their own profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
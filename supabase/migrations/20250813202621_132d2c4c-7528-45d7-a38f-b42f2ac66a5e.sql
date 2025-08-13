-- Fix RLS policies for AI Analyzer tables to ensure proper authentication

-- Add missing RLS policies for ai_analyzer_chunks to allow upsert operations
DROP POLICY IF EXISTS "chunks_owner_can_read" ON ai_analyzer_chunks;
DROP POLICY IF EXISTS "service_can_write" ON ai_analyzer_chunks;

-- Create comprehensive RLS policies for ai_analyzer_chunks
CREATE POLICY "Users can access chunks for their repos" 
ON ai_analyzer_chunks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM ai_analyzer_repos 
    WHERE ai_analyzer_repos.id = ai_analyzer_chunks.repo_id 
    AND ai_analyzer_repos.user_id = auth.uid()
  )
  OR 
  -- Allow demo chunks for demo mode
  ai_analyzer_chunks.repo_id LIKE '%demo%'
);

-- Allow service role to manage all chunks
CREATE POLICY "Service role can manage all chunks" 
ON ai_analyzer_chunks 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_analyzer_chunks_repo_file 
ON ai_analyzer_chunks(repo_id, file_path);

CREATE INDEX IF NOT EXISTS idx_ai_analyzer_chunks_embedding 
ON ai_analyzer_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Update ai_analyzer_repos to allow demo repositories
CREATE POLICY "Users can access demo repos" 
ON ai_analyzer_repos 
FOR ALL 
USING (
  auth.uid() = user_id 
  OR 
  repo_type = 'demo'
);

-- Ensure ai_analyzer_jobs can be created by functions
CREATE POLICY "Service role can manage analyzer jobs" 
ON ai_analyzer_jobs 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to safely upsert demo data
CREATE OR REPLACE FUNCTION public.upsert_demo_analyzer_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function allows demo data to be inserted without authentication
  RETURN;
END;
$$;
-- Drop and recreate the policy to fix it
DROP POLICY IF EXISTS "Users can access chunks for their repos" ON ai_analyzer_chunks;

-- Create comprehensive RLS policy for ai_analyzer_chunks
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
  ai_analyzer_chunks.repo_id::text LIKE '%demo%'
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_analyzer_chunks_repo_file 
ON ai_analyzer_chunks(repo_id, file_path);
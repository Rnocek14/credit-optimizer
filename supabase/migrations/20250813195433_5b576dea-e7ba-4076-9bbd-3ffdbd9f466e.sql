-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add proper vector column to chunks table (keeping old jsonb temporarily)
ALTER TABLE ai_analyzer_chunks
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector index for cosine similarity search
DROP INDEX IF EXISTS ai_analyzer_chunks_embedding_idx;
CREATE INDEX ai_analyzer_chunks_embedding_idx
  ON ai_analyzer_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Add supporting indexes for better query performance
CREATE INDEX IF NOT EXISTS ai_analyzer_chunks_repo_file_idx
  ON ai_analyzer_chunks (repo_id, file_path, chunk_index);

-- Ensure RLS is enabled and add proper policies
ALTER TABLE ai_analyzer_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "chunks_owner_can_read" ON ai_analyzer_chunks;
DROP POLICY IF EXISTS "service_can_write" ON ai_analyzer_chunks;

-- Create new RLS policies
CREATE POLICY "chunks_owner_can_read"
  ON ai_analyzer_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_analyzer_repos 
    WHERE ai_analyzer_repos.id = ai_analyzer_chunks.repo_id 
    AND ai_analyzer_repos.user_id = auth.uid()
  ));

CREATE POLICY "service_can_write"
  ON ai_analyzer_chunks FOR INSERT
  WITH CHECK (true);
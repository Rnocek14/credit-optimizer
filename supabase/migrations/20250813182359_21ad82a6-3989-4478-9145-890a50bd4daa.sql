-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Update ai_analyzer_chunks table to use pgvector for embeddings
ALTER TABLE ai_analyzer_chunks 
DROP COLUMN IF EXISTS embedding_data,
ADD COLUMN embedding vector(3072);

-- Add vector similarity search index
CREATE INDEX IF NOT EXISTS ai_analyzer_chunks_embedding_idx 
ON ai_analyzer_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Update ai_analyzer_repos to include better metadata
ALTER TABLE ai_analyzer_repos 
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS ignore_patterns text[] DEFAULT ARRAY['.git', 'node_modules', 'build', 'dist', '*.lock', '*.jpg', '*.png', '*.gif', '*.mp4', '*.pdf'];

-- Ensure proper data types for job tracking
ALTER TABLE ai_analyzer_jobs 
ALTER COLUMN cost_estimate TYPE numeric(10,4);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS ai_analyzer_jobs_user_id_idx ON ai_analyzer_jobs(user_id);
CREATE INDEX IF NOT EXISTS ai_analyzer_jobs_repo_id_idx ON ai_analyzer_jobs(repo_id);
CREATE INDEX IF NOT EXISTS ai_analyzer_chunks_repo_id_idx ON ai_analyzer_chunks(repo_id);
CREATE INDEX IF NOT EXISTS ai_analyzer_chunks_file_path_idx ON ai_analyzer_chunks(file_path);
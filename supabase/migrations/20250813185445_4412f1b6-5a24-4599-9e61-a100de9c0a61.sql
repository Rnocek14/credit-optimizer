-- Fix AI analyzer schema for pgvector
-- First, drop existing table if it exists with wrong schema
DROP TABLE IF EXISTS public.ai_analyzer_chunks CASCADE;

-- Create proper chunks table with vector column
CREATE TABLE public.ai_analyzer_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id text NOT NULL,
  file_path text NOT NULL,
  content_hash text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  total_chunks integer NOT NULL DEFAULT 1,
  language text,
  symbols text[],
  chunk_content text NOT NULL,
  embedding vector(3072) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX ai_chunks_repo_path_idx ON public.ai_analyzer_chunks (repo_id, file_path, chunk_index);
CREATE INDEX ai_chunks_embedding_idx ON public.ai_analyzer_chunks USING ivfflat (embedding vector_cosine_ops);

-- Update existing repos table to match expected schema
ALTER TABLE public.ai_analyzer_repos 
  ALTER COLUMN id SET DATA TYPE text,
  ADD COLUMN IF NOT EXISTS repo_type text DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS source_url text;

-- Enable RLS
ALTER TABLE public.ai_analyzer_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can access chunks for their repos" ON public.ai_analyzer_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ai_analyzer_repos 
      WHERE ai_analyzer_repos.id = ai_analyzer_chunks.repo_id 
      AND ai_analyzer_repos.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all chunks" ON public.ai_analyzer_chunks
  FOR ALL USING (true) WITH CHECK (true);
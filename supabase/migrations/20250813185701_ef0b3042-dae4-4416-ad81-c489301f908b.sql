-- Fix all AI analyzer schema inconsistencies
-- Drop foreign key constraints first
ALTER TABLE public.ai_analyzer_jobs DROP CONSTRAINT IF EXISTS ai_analyzer_jobs_repo_id_fkey;
ALTER TABLE public.ai_analyzer_audits DROP CONSTRAINT IF EXISTS ai_analyzer_audits_repo_id_fkey;

-- Update all repo_id columns to be text consistently
ALTER TABLE public.ai_analyzer_jobs ALTER COLUMN repo_id SET DATA TYPE text;
ALTER TABLE public.ai_analyzer_audits ALTER COLUMN repo_id SET DATA TYPE text;

-- Now drop and recreate chunks table with correct schema
DROP TABLE IF EXISTS public.ai_analyzer_chunks CASCADE;

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
  embedding vector(1536) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX ai_chunks_repo_path_idx ON public.ai_analyzer_chunks (repo_id, file_path, chunk_index);
CREATE INDEX ai_chunks_embedding_idx ON public.ai_analyzer_chunks USING ivfflat (embedding vector_cosine_ops);

-- Enable RLS on chunks
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
-- Create AI Analyzer tables for codebase analysis and caching

-- Repository tracking table
CREATE TABLE public.ai_analyzer_repos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_url TEXT,
  repo_type TEXT NOT NULL DEFAULT 'local',
  indexed_at TIMESTAMP WITH TIME ZONE,
  file_count INTEGER DEFAULT 0,
  language_breakdown JSONB DEFAULT '{}',
  ignore_patterns TEXT[] DEFAULT ARRAY['.git', 'node_modules', 'build', 'dist', '*.lock', '*.jpg', '*.png', '*.gif', '*.mp4', '*.pdf'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Code chunks for embeddings and analysis
CREATE TABLE public.ai_analyzer_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID NOT NULL REFERENCES public.ai_analyzer_repos(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  chunk_content TEXT NOT NULL,
  embedding_vector vector(1536), -- OpenAI text-embedding-3-large dimensions
  symbols TEXT[] DEFAULT '{}',
  language TEXT,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  total_chunks INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Analysis jobs tracking
CREATE TABLE public.ai_analyzer_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID NOT NULL REFERENCES public.ai_analyzer_repos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('index', 'review', 'refactor', 'tests', 'lifepath_audit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input_data JSONB NOT NULL DEFAULT '{}',
  results JSONB,
  error_message TEXT,
  token_usage INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10,4) DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Life Path audit results
CREATE TABLE public.ai_analyzer_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID NOT NULL REFERENCES public.ai_analyzer_repos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  audit_type TEXT NOT NULL DEFAULT 'lifepath',
  scorecard JSONB NOT NULL DEFAULT '{}',
  gaps JSONB DEFAULT '[]',
  quick_wins JSONB DEFAULT '[]',
  architecture_recs JSONB DEFAULT '[]',
  ux_recs JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ai_analyzer_repos_user_id ON public.ai_analyzer_repos(user_id);
CREATE INDEX idx_ai_analyzer_chunks_repo_id ON public.ai_analyzer_chunks(repo_id);
CREATE INDEX idx_ai_analyzer_chunks_file_path ON public.ai_analyzer_chunks(file_path);
CREATE INDEX idx_ai_analyzer_chunks_content_hash ON public.ai_analyzer_chunks(content_hash);
CREATE INDEX idx_ai_analyzer_jobs_repo_id ON public.ai_analyzer_jobs(repo_id);
CREATE INDEX idx_ai_analyzer_jobs_user_id ON public.ai_analyzer_jobs(user_id);
CREATE INDEX idx_ai_analyzer_jobs_status ON public.ai_analyzer_jobs(status);
CREATE INDEX idx_ai_analyzer_audits_repo_id ON public.ai_analyzer_audits(repo_id);

-- Enable Row Level Security
ALTER TABLE public.ai_analyzer_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyzer_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyzer_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyzer_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_analyzer_repos
CREATE POLICY "Users can manage their own repos" 
ON public.ai_analyzer_repos 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_analyzer_chunks
CREATE POLICY "Users can access chunks for their repos" 
ON public.ai_analyzer_chunks 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.ai_analyzer_repos 
  WHERE id = ai_analyzer_chunks.repo_id AND user_id = auth.uid()
));

-- RLS Policies for ai_analyzer_jobs
CREATE POLICY "Users can manage their own jobs" 
ON public.ai_analyzer_jobs 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_analyzer_audits
CREATE POLICY "Users can access their own audits" 
ON public.ai_analyzer_audits 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role policies
CREATE POLICY "Service role can manage all analyzer data" 
ON public.ai_analyzer_repos 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage all chunks" 
ON public.ai_analyzer_chunks 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage all jobs" 
ON public.ai_analyzer_jobs 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage all audits" 
ON public.ai_analyzer_audits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ai_analyzer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_ai_analyzer_repos_updated_at
  BEFORE UPDATE ON public.ai_analyzer_repos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_analyzer_updated_at();

CREATE TRIGGER update_ai_analyzer_chunks_updated_at
  BEFORE UPDATE ON public.ai_analyzer_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_analyzer_updated_at();
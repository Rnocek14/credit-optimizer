-- Create proof_projects and related tables with unique names to avoid conflicts
CREATE TABLE IF NOT EXISTS public.proof_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'personal', -- personal, course, certification, challenge
  status TEXT NOT NULL DEFAULT 'planning', -- planning, in_progress, completed, paused
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  estimated_hours INTEGER DEFAULT 10,
  github_url TEXT,
  demo_url TEXT,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  skills_to_validate TEXT[] DEFAULT '{}',
  validation_criteria JSONB DEFAULT '[]',
  project_data JSONB DEFAULT '{}', -- flexible metadata
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Use unique table names to avoid conflicts with existing objects
CREATE TABLE IF NOT EXISTS public.proof_project_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.proof_projects(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  validation_level TEXT DEFAULT 'basic', -- basic, intermediate, advanced
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proof_project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.proof_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  milestone_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proof_projects_user_id ON public.proof_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_projects_track_id ON public.proof_projects(track_id);
CREATE INDEX IF NOT EXISTS idx_proof_projects_status ON public.proof_projects(status);
CREATE INDEX IF NOT EXISTS idx_proof_project_skills_project_id ON public.proof_project_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_proof_project_milestones_project_id ON public.proof_project_milestones(project_id);

-- RLS
ALTER TABLE public.proof_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_project_milestones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proof_projects' AND policyname = 'Users can manage their own proof projects'
  ) THEN
    CREATE POLICY "Users can manage their own proof projects"
      ON public.proof_projects
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proof_projects' AND policyname = 'Service role can manage all proof projects'
  ) THEN
    CREATE POLICY "Service role can manage all proof projects"
      ON public.proof_projects
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proof_project_skills' AND policyname = 'Users can manage skills for their projects'
  ) THEN
    CREATE POLICY "Users can manage skills for their projects"
      ON public.proof_project_skills
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.proof_projects pp 
          WHERE pp.id = proof_project_skills.project_id 
          AND pp.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.proof_projects pp 
          WHERE pp.id = proof_project_skills.project_id 
          AND pp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proof_project_skills' AND policyname = 'Service role can manage all project skills'
  ) THEN
    CREATE POLICY "Service role can manage all project skills"
      ON public.proof_project_skills
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proof_project_milestones' AND policyname = 'Users can manage milestones for their projects'
  ) THEN
    CREATE POLICY "Users can manage milestones for their projects"
      ON public.proof_project_milestones
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.proof_projects pp 
          WHERE pp.id = proof_project_milestones.project_id 
          AND pp.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.proof_projects pp 
          WHERE pp.id = proof_project_milestones.project_id 
          AND pp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proof_project_milestones' AND policyname = 'Service role can manage all project milestones'
  ) THEN
    CREATE POLICY "Service role can manage all project milestones"
      ON public.proof_project_milestones
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_proof_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_proof_projects_updated_at ON public.proof_projects;
CREATE TRIGGER update_proof_projects_updated_at
  BEFORE UPDATE ON public.proof_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proof_projects_updated_at();

-- Award XP on project completion
CREATE OR REPLACE FUNCTION public.award_project_completion_xp()
RETURNS TRIGGER AS $$
DECLARE
  xp_amount INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    xp_amount := (COALESCE(NEW.difficulty_level,1) * 10) + (COALESCE(NEW.estimated_hours,0) / 2);
    PERFORM public.award_xp(
      NEW.user_id,
      xp_amount,
      'PROJECT_COMPLETED',
      'Completed proof project: ' || NEW.title,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_project_completion_xp_trigger ON public.proof_projects;
CREATE TRIGGER award_project_completion_xp_trigger
  AFTER UPDATE ON public.proof_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.award_project_completion_xp();
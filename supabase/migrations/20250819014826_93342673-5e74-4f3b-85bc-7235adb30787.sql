-- Create proof_projects table
CREATE TABLE public.proof_projects (
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
  project_data JSONB DEFAULT '{}', -- storing flexible project metadata
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_skills mapping table
CREATE TABLE public.project_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.proof_projects(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  validation_level TEXT DEFAULT 'basic', -- basic, intermediate, advanced
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_milestones table
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.proof_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  milestone_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_proof_projects_user_id ON public.proof_projects(user_id);
CREATE INDEX idx_proof_projects_track_id ON public.proof_projects(track_id);
CREATE INDEX idx_proof_projects_status ON public.proof_projects(status);
CREATE INDEX idx_project_skills_project_id ON public.project_skills(project_id);
CREATE INDEX idx_project_milestones_project_id ON public.project_milestones(project_id);

-- Enable RLS
ALTER TABLE public.proof_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proof_projects
CREATE POLICY "Users can manage their own proof projects"
  ON public.proof_projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all proof projects"
  ON public.proof_projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for project_skills
CREATE POLICY "Users can manage skills for their projects"
  ON public.project_skills
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.proof_projects pp 
      WHERE pp.id = project_skills.project_id 
      AND pp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proof_projects pp 
      WHERE pp.id = project_skills.project_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all project skills"
  ON public.project_skills
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for project_milestones
CREATE POLICY "Users can manage milestones for their projects"
  ON public.project_milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.proof_projects pp 
      WHERE pp.id = project_milestones.project_id 
      AND pp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proof_projects pp 
      WHERE pp.id = project_milestones.project_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all project milestones"
  ON public.project_milestones
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update trigger for proof_projects
CREATE OR REPLACE FUNCTION public.update_proof_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proof_projects_updated_at
  BEFORE UPDATE ON public.proof_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proof_projects_updated_at();

-- Function to award XP for project completion
CREATE OR REPLACE FUNCTION public.award_project_completion_xp()
RETURNS TRIGGER AS $$
DECLARE
  xp_amount INTEGER;
BEGIN
  -- Only award XP when project is marked as completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate XP based on difficulty and estimated hours
    xp_amount := (NEW.difficulty_level * 10) + (NEW.estimated_hours / 2);
    
    -- Award XP
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

CREATE TRIGGER award_project_completion_xp_trigger
  AFTER UPDATE ON public.proof_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.award_project_completion_xp();
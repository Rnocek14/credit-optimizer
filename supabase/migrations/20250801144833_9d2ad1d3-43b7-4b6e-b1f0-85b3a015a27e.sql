-- Create user_cri_goals table for enhanced goal setting (only if it doesn't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_cri_goals') THEN
    CREATE TABLE public.user_cri_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      target_cri INTEGER NOT NULL DEFAULT 80 CHECK (target_cri >= 0 AND target_cri <= 100),
      current_cri INTEGER DEFAULT 0 CHECK (current_cri >= 0 AND current_cri <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.user_cri_goals ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can manage their own CRI goals"
      ON public.user_cri_goals
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Service role can manage all CRI goals"
      ON public.user_cri_goals
      FOR ALL
      USING (true)
      WITH CHECK (true);

    -- Add trigger for updated_at
    CREATE TRIGGER update_user_cri_goals_updated_at
      BEFORE UPDATE ON public.user_cri_goals
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    -- Create index for performance
    CREATE INDEX idx_user_cri_goals_user_id ON public.user_cri_goals(user_id);
  END IF;
END $$;

-- Add columns to career_goals for enhanced functionality (only if they don't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'skill_gaps') THEN
    ALTER TABLE public.career_goals ADD COLUMN skill_gaps TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'estimated_timeline_weeks') THEN
    ALTER TABLE public.career_goals ADD COLUMN estimated_timeline_weeks INTEGER DEFAULT 12;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'priority_score') THEN
    ALTER TABLE public.career_goals ADD COLUMN priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'market_demand_score') THEN
    ALTER TABLE public.career_goals ADD COLUMN market_demand_score INTEGER DEFAULT 50 CHECK (market_demand_score >= 0 AND market_demand_score <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'current_progress') THEN
    ALTER TABLE public.career_goals ADD COLUMN current_progress INTEGER DEFAULT 0 CHECK (current_progress >= 0 AND current_progress <= 100);
  END IF;
END $$;
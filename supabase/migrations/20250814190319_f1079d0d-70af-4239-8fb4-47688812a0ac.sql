-- Add completion triggers table for cross-hub automation (if not exists)
CREATE TABLE IF NOT EXISTS completion_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  source_data JSONB NOT NULL,
  target_action TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add micro-goal tracking columns (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'source_hub') THEN
    ALTER TABLE career_goals ADD COLUMN source_hub TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'source_item_id') THEN
    ALTER TABLE career_goals ADD COLUMN source_item_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'auto_created') THEN
    ALTER TABLE career_goals ADD COLUMN auto_created BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_plan_items' AND column_name = 'cri_boost_score') THEN
    ALTER TABLE saved_plan_items ADD COLUMN cri_boost_score NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_plan_items' AND column_name = 'cri_explanation') THEN
    ALTER TABLE saved_plan_items ADD COLUMN cri_explanation TEXT;
  END IF;
END $$;

-- Create micro_goals table (if not exists)
CREATE TABLE IF NOT EXISTS micro_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_item_type TEXT NOT NULL,
  source_item_id TEXT NOT NULL,
  source_hub TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  estimated_duration TEXT,
  suggested_due_date DATE,
  status TEXT DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (if tables exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'completion_triggers') THEN
    ALTER TABLE completion_triggers ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'micro_goals') THEN
    ALTER TABLE micro_goals ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
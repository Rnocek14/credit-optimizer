-- Add completion triggers table for cross-hub automation
CREATE TABLE IF NOT EXISTS completion_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL, -- 'skill_level', 'goal_complete', 'course_complete', 'step_complete'
  source_data JSONB NOT NULL,
  target_action TEXT NOT NULL, -- 'create_recommendation', 'update_progress', 'celebrate', 'create_micro_goal'
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add micro-goal tracking to career_goals
ALTER TABLE career_goals ADD COLUMN IF NOT EXISTS source_hub TEXT;
ALTER TABLE career_goals ADD COLUMN IF NOT EXISTS source_item_id TEXT;
ALTER TABLE career_goals ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE;
ALTER TABLE career_goals ADD COLUMN IF NOT EXISTS micro_goal BOOLEAN DEFAULT FALSE;
ALTER TABLE career_goals ADD COLUMN IF NOT EXISTS suggested_due_date DATE;

-- Add CRI influence tracking to saved_plan_items
ALTER TABLE saved_plan_items ADD COLUMN IF NOT EXISTS cri_boost_score NUMERIC DEFAULT 0;
ALTER TABLE saved_plan_items ADD COLUMN IF NOT EXISTS cri_explanation TEXT;

-- Create micro_goals table for lightweight goal tracking
CREATE TABLE IF NOT EXISTS micro_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_item_type TEXT NOT NULL, -- 'course', 'career_path', 'skill', 'project'
  source_item_id TEXT NOT NULL,
  source_hub TEXT NOT NULL, -- 'discover', 'plan', 'progress'
  priority TEXT DEFAULT 'medium',
  estimated_duration TEXT,
  suggested_due_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE completion_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for completion_triggers
CREATE POLICY "Users can manage their own completion triggers" ON completion_triggers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all completion triggers" ON completion_triggers
  FOR ALL USING (true);

-- RLS policies for micro_goals
CREATE POLICY "Users can manage their own micro goals" ON micro_goals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all micro goals" ON micro_goals
  FOR ALL USING (true);

-- Function to auto-create micro-goal when saving to plan
CREATE OR REPLACE FUNCTION create_micro_goal_from_save()
RETURNS TRIGGER AS $$
DECLARE
  due_date DATE;
  duration_days INTEGER;
BEGIN
  -- Calculate suggested due date based on estimated time
  duration_days := CASE 
    WHEN NEW.item_type = 'course' THEN 28  -- 4 weeks
    WHEN NEW.item_type = 'career_path' THEN 180  -- 6 months
    WHEN NEW.item_type = 'project' THEN 14  -- 2 weeks
    WHEN NEW.item_type = 'skill' THEN 42  -- 6 weeks
    ELSE 21  -- 3 weeks default
  END;
  
  due_date := CURRENT_DATE + (duration_days || ' days')::INTERVAL;
  
  -- Create micro-goal
  INSERT INTO micro_goals (
    user_id,
    title,
    description,
    source_item_type,
    source_item_id,
    source_hub,
    priority,
    estimated_duration,
    suggested_due_date,
    metadata
  ) VALUES (
    NEW.user_id,
    'Complete: ' || NEW.title,
    'Auto-created from ' || NEW.added_from_hub || ' save: ' || NEW.description,
    NEW.item_type,
    NEW.item_id,
    NEW.added_from_hub,
    NEW.priority,
    NEW.estimated_time_to_complete,
    due_date,
    jsonb_build_object(
      'auto_created', true,
      'original_save_id', NEW.id,
      'skill_tags', NEW.skill_tags
    )
  );
  
  -- Create completion trigger for recommendation feed
  INSERT INTO completion_triggers (
    user_id,
    trigger_type,
    source_data,
    target_action
  ) VALUES (
    NEW.user_id,
    'micro_goal_created',
    jsonb_build_object(
      'item_title', NEW.title,
      'item_type', NEW.item_type,
      'due_date', due_date,
      'source_hub', NEW.added_from_hub
    ),
    'create_recommendation'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create micro-goals when saving to plan
CREATE TRIGGER auto_create_micro_goal
  AFTER INSERT ON saved_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION create_micro_goal_from_save();

-- Function to handle step completion and trigger cross-hub updates
CREATE OR REPLACE FUNCTION handle_step_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Create completion trigger for celebration
    INSERT INTO completion_triggers (
      user_id,
      trigger_type,
      source_data,
      target_action
    ) VALUES (
      NEW.user_id,
      'step_completed',
      jsonb_build_object(
        'step_id', NEW.step_id,
        'completed_at', NEW.completed_at,
        'xp_awarded', COALESCE(NEW.xp_awarded, 25)
      ),
      'celebrate'
    );
    
    -- Check if this unlocks next steps and create trigger
    INSERT INTO completion_triggers (
      user_id,
      trigger_type,
      source_data,
      target_action
    ) VALUES (
      NEW.user_id,
      'check_next_steps',
      jsonb_build_object(
        'completed_step_id', NEW.step_id,
        'user_id', NEW.user_id
      ),
      'create_recommendation'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger for micro_goals
CREATE OR REPLACE FUNCTION update_micro_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_micro_goals_updated_at
  BEFORE UPDATE ON micro_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_micro_goals_updated_at();
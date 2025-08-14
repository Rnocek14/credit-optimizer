-- P3/P4 RC Hardening: Add idempotency constraints to prevent duplicate saves

-- Prevent duplicate micro-goals from same source using career_goals table
CREATE UNIQUE INDEX IF NOT EXISTS career_goals_user_source_uidx 
ON career_goals (user_id, source_item_id, source_hub) 
WHERE source_item_id IS NOT NULL AND source_hub IS NOT NULL;

-- Add completion trigger function for Plan → Progress flow
CREATE OR REPLACE FUNCTION handle_milestone_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a career goal is marked complete, create celebration moment
  IF OLD.current_progress < 100 AND NEW.current_progress = 100 THEN
    INSERT INTO celebration_moments (
      user_id,
      celebration_type,
      celebration_data,
      trigger_data
    ) VALUES (
      NEW.user_id,
      'milestone_completed',
      jsonb_build_object(
        'goalTitle', NEW.title,
        'xpAwarded', 50,
        'message', 'Congratulations on completing your goal!'
      ),
      jsonb_build_object(
        'goalId', NEW.id,
        'completedAt', NOW(),
        'source', 'career_goal_completion'
      )
    );
    
    -- Create completion trigger for cross-hub integration
    INSERT INTO completion_triggers (
      user_id,
      trigger_type,
      target_action,
      source_data
    ) VALUES (
      NEW.user_id,
      'milestone_completed',
      'award_xp_and_celebrate',
      jsonb_build_object(
        'goalId', NEW.id,
        'goalTitle', NEW.title,
        'xpAmount', 50
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on career_goals update
DROP TRIGGER IF EXISTS milestone_completion_trigger ON career_goals;
CREATE TRIGGER milestone_completion_trigger
  AFTER UPDATE ON career_goals
  FOR EACH ROW
  EXECUTE FUNCTION handle_milestone_completion();
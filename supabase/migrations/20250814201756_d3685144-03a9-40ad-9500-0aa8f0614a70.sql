-- P3/P4 RC Hardening: Add idempotency constraints to prevent duplicate saves

-- Prevent duplicate saved plan items for same user+item+type
CREATE UNIQUE INDEX IF NOT EXISTS plan_items_user_item_type_uidx 
ON plan_items (user_id, item_id, item_type);

-- Prevent duplicate micro-goals from same source
CREATE UNIQUE INDEX IF NOT EXISTS career_goals_user_source_uidx 
ON career_goals (user_id, source_item_id, source_hub) 
WHERE source_item_id IS NOT NULL AND source_hub IS NOT NULL;

-- Add database trigger for auto micro-goal creation with idempotency check
CREATE OR REPLACE FUNCTION auto_create_micro_goal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create micro-goal for course/career_path saves from discover/plan hubs
  IF NEW.item_type IN ('course', 'career_path') AND 
     NEW.metadata->>'source' IN ('discover', 'plan', 'today_dashboard') THEN
    
    -- Check if micro-goal already exists for this item
    IF NOT EXISTS (
      SELECT 1 FROM career_goals 
      WHERE user_id = NEW.user_id 
        AND source_item_id = NEW.item_id 
        AND source_hub = NEW.metadata->>'source'
        AND micro_goal = true
    ) THEN
      -- Create micro-goal with due date T+7 days
      INSERT INTO career_goals (
        user_id,
        title,
        description,
        micro_goal,
        auto_created,
        source_hub,
        source_item_id,
        target_date,
        suggested_due_date,
        priority_score,
        estimated_timeline_weeks,
        skill_gaps,
        active
      ) VALUES (
        NEW.user_id,
        'Complete ' || NEW.title,
        'Auto-created micro-goal from ' || NEW.metadata->>'source' || ' hub',
        true,
        true,
        NEW.metadata->>'source',
        NEW.item_id,
        CURRENT_DATE + INTERVAL '7 days',
        CURRENT_DATE + INTERVAL '7 days',
        CASE NEW.priority
          WHEN 'high' THEN 80
          WHEN 'medium' THEN 60
          ELSE 40
        END,
        CASE 
          WHEN NEW.time_estimate SIMILAR TO '%week%' THEN 
            CAST(SUBSTRING(NEW.time_estimate FROM '\d+') AS INTEGER)
          WHEN NEW.time_estimate SIMILAR TO '%month%' THEN 
            CAST(SUBSTRING(NEW.time_estimate FROM '\d+') AS INTEGER) * 4
          ELSE 2
        END,
        COALESCE(NEW.skill_tags, ARRAY[]::text[]),
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on plan_items insert
DROP TRIGGER IF EXISTS auto_create_micro_goal_trigger ON plan_items;
CREATE TRIGGER auto_create_micro_goal_trigger
  AFTER INSERT ON plan_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_micro_goal();

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
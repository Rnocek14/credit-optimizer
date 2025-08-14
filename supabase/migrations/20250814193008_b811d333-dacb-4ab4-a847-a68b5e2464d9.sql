-- Extend saved_plan_items.item_type to support quick_win and micro_task
ALTER TABLE saved_plan_items
  DROP CONSTRAINT IF EXISTS saved_plan_items_item_type_check;

ALTER TABLE saved_plan_items
  ADD CONSTRAINT saved_plan_items_item_type_check
  CHECK (item_type IN ('course','career_path','mentor','skill','project','quick_win','micro_task'));

-- Update trigger to create micro-goals for quick_win and micro_task
CREATE OR REPLACE FUNCTION create_micro_goal_on_save()
RETURNS trigger AS $$
DECLARE
  due_date timestamptz;
BEGIN
  -- Suggested due date logic: default 14 days, can be smarter based on CRI
  due_date := now() + interval '14 days';

  -- Create micro-goals for items from discover hub or quick_win/micro_task types
  IF NEW.added_from_hub = 'discover'
     OR NEW.item_type IN ('quick_win','micro_task') THEN
    INSERT INTO micro_goals (
      user_id, source_plan_item_id, title, description, priority,
      suggested_due_date, metadata, status, created_at
    )
    VALUES (
      NEW.user_id, NEW.id, NEW.title, COALESCE(NEW.description, ''),
      COALESCE(NEW.priority, 'medium'), due_date,
      COALESCE(NEW.metadata, '{}'::jsonb), 'pending', now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_create_micro_goal_on_save ON saved_plan_items;
CREATE TRIGGER trg_create_micro_goal_on_save
AFTER INSERT ON saved_plan_items
FOR EACH ROW
EXECUTE FUNCTION create_micro_goal_on_save();
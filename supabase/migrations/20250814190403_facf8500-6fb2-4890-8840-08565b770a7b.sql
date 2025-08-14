-- Add RLS policies for new tables (drop and recreate to avoid conflicts)

-- Policies for completion_triggers
DROP POLICY IF EXISTS "Users can manage their own completion triggers" ON completion_triggers;
DROP POLICY IF EXISTS "Service role can manage all completion triggers" ON completion_triggers;

CREATE POLICY "Users can manage their own completion triggers" 
ON completion_triggers FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all completion triggers" 
ON completion_triggers FOR ALL 
USING (true);

-- Policies for micro_goals
DROP POLICY IF EXISTS "Users can manage their own micro goals" ON micro_goals;
DROP POLICY IF EXISTS "Service role can manage all micro goals" ON micro_goals;

CREATE POLICY "Users can manage their own micro goals" 
ON micro_goals FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all micro goals" 
ON micro_goals FOR ALL 
USING (true);
-- Add missing RLS policies for new tables
CREATE POLICY IF NOT EXISTS "Users can manage their own completion triggers" 
ON completion_triggers FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage all completion triggers" 
ON completion_triggers FOR ALL 
USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage their own micro goals" 
ON micro_goals FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage all micro goals" 
ON micro_goals FOR ALL 
USING (true);
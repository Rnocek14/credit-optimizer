-- Create the `user_preferences` table to store experience level and onboarding status
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  preferred_features TEXT[],
  last_active_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the `user_goals` table for goal detection logic
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  goal_title TEXT,
  goal_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON user_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON user_preferences FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON user_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all preferences" 
ON user_preferences FOR ALL 
USING (true);

-- RLS policies for user_goals  
CREATE POLICY "Users can view their own goals" 
ON user_goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own goals" 
ON user_goals FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all goals" 
ON user_goals FOR ALL 
USING (true);

-- Add update trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
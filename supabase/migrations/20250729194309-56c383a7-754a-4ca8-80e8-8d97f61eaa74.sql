-- Fix the foreign key constraint issue by first ensuring profiles has proper constraints
-- Add unique constraint on user_id in profiles table if it doesn't exist
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Now drop the foreign key constraint to auth.users and create one to profiles instead
ALTER TABLE personalized_recommendations 
DROP CONSTRAINT IF EXISTS personalized_recommendations_user_id_fkey;

-- Add new foreign key to profiles table instead
ALTER TABLE personalized_recommendations 
ADD CONSTRAINT personalized_recommendations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
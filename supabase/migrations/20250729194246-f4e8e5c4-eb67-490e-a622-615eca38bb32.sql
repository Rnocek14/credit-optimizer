-- Fix the foreign key constraint issue for test users
-- The personalized_recommendations table has a foreign key to auth.users
-- but test users like Aisha only exist in the profiles table
-- We need to either remove the foreign key constraint or change it to reference profiles

-- First, let's check what foreign key constraints exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='personalized_recommendations';

-- Drop the foreign key constraint to auth.users and create one to profiles instead
-- This will allow test users who exist in profiles but not auth.users to work
ALTER TABLE personalized_recommendations 
DROP CONSTRAINT IF EXISTS personalized_recommendations_user_id_fkey;

-- Add new foreign key to profiles table instead
ALTER TABLE personalized_recommendations 
ADD CONSTRAINT personalized_recommendations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
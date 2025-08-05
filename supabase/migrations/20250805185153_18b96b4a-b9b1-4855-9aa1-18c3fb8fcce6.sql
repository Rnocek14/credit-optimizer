-- Fix mentor curation queue foreign key constraint
-- Drop the existing foreign key that references auth.users
ALTER TABLE mentor_course_curations 
DROP CONSTRAINT IF EXISTS mentor_course_curations_mentor_id_fkey;

-- Add new foreign key that references profiles.user_id
ALTER TABLE mentor_course_curations 
ADD CONSTRAINT mentor_course_curations_mentor_id_fkey 
FOREIGN KEY (mentor_id) REFERENCES profiles(user_id) 
ON DELETE CASCADE;
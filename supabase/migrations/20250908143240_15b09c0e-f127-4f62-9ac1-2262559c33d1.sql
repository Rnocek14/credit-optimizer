-- Fix the readiness level check constraint in user_cri_scores table
-- The current constraint is rejecting 'Beginner' as a valid readiness level

ALTER TABLE user_cri_scores DROP CONSTRAINT IF EXISTS user_cri_scores_readiness_level_check;

-- Add the corrected constraint that allows proper readiness levels including 'Beginner'
ALTER TABLE user_cri_scores ADD CONSTRAINT user_cri_scores_readiness_level_check 
CHECK (readiness_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Ready'));

-- Also check if the constraint name might be different and fix any similar constraints
DO $$
BEGIN
    -- Drop any constraints on readiness_level that might be causing issues
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%readiness_level%' 
        AND table_name = 'user_cri_scores'
    ) THEN
        EXECUTE 'ALTER TABLE user_cri_scores DROP CONSTRAINT IF EXISTS ' || 
                (SELECT constraint_name FROM information_schema.check_constraints 
                 WHERE constraint_name LIKE '%readiness_level%' 
                 AND table_name = 'user_cri_scores' 
                 LIMIT 1);
    END IF;
    
    -- Add the correct constraint
    ALTER TABLE user_cri_scores ADD CONSTRAINT user_cri_scores_readiness_level_check 
    CHECK (readiness_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Ready'));
END $$;
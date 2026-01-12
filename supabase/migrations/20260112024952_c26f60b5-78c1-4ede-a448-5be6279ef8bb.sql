-- Step 1: Delete duplicate rules, keeping the one with the highest id (most recent insert)
-- This handles both course-specific and category-level (NULL source_course_code) rules

WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY target_institution, source_institution, COALESCE(source_course_code, ''), COALESCE(rule_type, 'course')
           ORDER BY id DESC
         ) as rn
  FROM credit_transfer_rules
)
DELETE FROM credit_transfer_rules
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Step 2: Add unique constraint to prevent future duplicates
-- Using a unique index with COALESCE to handle NULLs properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transfer_rules_unique_rule
ON credit_transfer_rules (
  target_institution, 
  source_institution, 
  COALESCE(source_course_code, ''), 
  COALESCE(rule_type, 'course')
);

-- Step 3: Add a comment explaining the constraint
COMMENT ON INDEX idx_credit_transfer_rules_unique_rule IS 
'Prevents duplicate transfer rules for the same target/source institution and course/category combination. Uses COALESCE to handle NULL values for category-level rules.';
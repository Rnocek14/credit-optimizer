-- Check user_cri_scores table structure and constraints
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_cri_scores' 
ORDER BY ordinal_position;
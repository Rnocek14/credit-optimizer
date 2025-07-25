-- Force schema cache refresh by accessing table metadata
-- This triggers PostgreSQL to reload relationship information

-- Touch each table to refresh metadata cache
SELECT count(*) FROM information_schema.tables WHERE table_name = 'market_trends';
SELECT count(*) FROM information_schema.tables WHERE table_name = 'career_paths';
SELECT count(*) FROM information_schema.tables WHERE table_name = 'locations';

-- Verify foreign key constraints are properly registered
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'market_trends';

-- Refresh PostgREST schema cache by incrementing schema version
NOTIFY pgrst, 'reload schema';
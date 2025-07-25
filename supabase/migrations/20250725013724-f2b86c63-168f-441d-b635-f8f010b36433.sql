-- Refresh PostgreSQL system catalogs and schema cache
-- This ensures new foreign key relationships are visible for joins

-- Reset query plan cache
SELECT pg_stat_reset();

-- Refresh materialized views if any exist
REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS pg_stat_statements;

-- Force schema cache refresh by touching table metadata
SELECT pg_total_relation_size('market_trends');
SELECT pg_total_relation_size('career_paths'); 
SELECT pg_total_relation_size('locations');

-- Verify foreign key constraints are active
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'market_trends';
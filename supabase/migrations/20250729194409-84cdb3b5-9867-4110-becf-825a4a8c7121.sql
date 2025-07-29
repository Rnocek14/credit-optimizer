-- Fix similar foreign key constraints for other autonomous action tables
-- Check and fix autonomous_workflows table
ALTER TABLE autonomous_workflows 
DROP CONSTRAINT IF EXISTS autonomous_workflows_user_id_fkey;

ALTER TABLE autonomous_workflows 
ADD CONSTRAINT autonomous_workflows_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Check and fix market_alerts table  
ALTER TABLE market_alerts 
DROP CONSTRAINT IF EXISTS market_alerts_user_id_fkey;

ALTER TABLE market_alerts 
ADD CONSTRAINT market_alerts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Check and fix conversation_sessions table
ALTER TABLE conversation_sessions 
DROP CONSTRAINT IF EXISTS conversation_sessions_user_id_fkey;

ALTER TABLE conversation_sessions 
ADD CONSTRAINT conversation_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
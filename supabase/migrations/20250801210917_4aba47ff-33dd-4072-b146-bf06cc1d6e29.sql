-- Fix security issue with extensions in public schema by moving uuid-ossp to extensions schema
-- This addresses the WARN 1: Extension in Public security warning

-- First check if the extension exists in public schema
DO $$ 
BEGIN
    -- Move uuid-ossp extension from public to extensions schema if it exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        -- Create extensions schema if it doesn't exist
        CREATE SCHEMA IF NOT EXISTS extensions;
        
        -- Drop extension from public and recreate in extensions
        DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
    END IF;
END $$;
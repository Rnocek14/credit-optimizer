-- Move PostgreSQL extensions out of public schema for security
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Revoke create permissions on public schema to prevent future extensions there
REVOKE CREATE ON SCHEMA public FROM public;
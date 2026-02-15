-- Migration: Add query timeout configuration
-- Issue: #89
-- 
-- Set statement timeout at database level (30 seconds)
ALTER DATABASE current SET statement_timeout = '30s';

-- Set per-role timeouts
-- Authenticated users (API requests): 15s - fail fast for user-facing queries
ALTER ROLE authenticated SET statement_timeout = '15s';

-- Service role (background jobs, edge functions): 60s - allow longer for batch operations
ALTER ROLE service_role SET statement_timeout = '60s';

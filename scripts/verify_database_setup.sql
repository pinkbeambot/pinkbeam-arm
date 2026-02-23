-- Database Setup Verification Report
-- Run this in Supabase SQL Editor to verify cleanup

-- 1. Count all tables in public schema
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 3. Verify no placeholder data remains
SELECT 
  (SELECT COUNT(*) FROM tenants WHERE id::text LIKE '00000000%') as placeholder_tenants,
  (SELECT COUNT(*) FROM users WHERE id::text LIKE '00000000%') as placeholder_users,
  (SELECT COUNT(*) FROM agents WHERE id::text LIKE '00000000%') as placeholder_agents,
  (SELECT COUNT(*) FROM tasks WHERE id::text LIKE '00000000%') as placeholder_tasks,
  (SELECT COUNT(*) FROM decisions WHERE id::text LIKE '00000000%') as placeholder_decisions,
  (SELECT COUNT(*) FROM escalations WHERE id::text LIKE '00000000%') as placeholder_escalations;

-- 4. Verify key functions exist
SELECT 
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_current_tenant') as get_current_tenant_exists,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_tenant_context') as set_tenant_context_exists,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'log_activity') as log_activity_exists,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'refresh_agent_performance_daily') as refresh_analytics_exists;

-- 5. Check migration count
SELECT COUNT(*) as migration_count FROM supabase_migrations.schema_migrations;

-- ============================================================================
-- CLEANUP PLACEHOLDER/DEMO DATA (Safe Version)
-- Only deletes from tables that exist
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================================

-- Delete from tenants last (has FK dependencies)
-- First clean up child tables

-- 1. Clean up agent_configs (if table exists)
DO $$
BEGIN
    DELETE FROM agent_configs 
    WHERE agent_id IN (
        SELECT id FROM agents 
        WHERE id::text LIKE '00000000-0000-0000-0000-00000000%'
    );
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'agent_configs table does not exist, skipping';
END $$;

-- 2. Clean up tasks
DO $$
BEGIN
    DELETE FROM tasks 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'tasks table does not exist, skipping';
END $$;

-- 3. Clean up activities
DO $$
BEGIN
    DELETE FROM activities 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'activities table does not exist, skipping';
END $$;

-- 4. Clean up decisions
DO $$
BEGIN
    DELETE FROM decisions 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'decisions table does not exist, skipping';
END $$;

-- 5. Clean up escalations
DO $$
BEGIN
    DELETE FROM escalations 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'escalations table does not exist, skipping';
END $$;

-- 6. Clean up messages
DO $$
BEGIN
    DELETE FROM messages 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%'
       OR chat_id IN (SELECT id FROM chats WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%');
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'messages table does not exist, skipping';
END $$;

-- 7. Clean up chats
DO $$
BEGIN
    DELETE FROM chats 
    WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'chats table does not exist, skipping';
END $$;

-- 8. Clean up agent sessions
DO $$
BEGIN
    DELETE FROM agent_sessions 
    WHERE agent_id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'agent_sessions table does not exist, skipping';
END $$;

-- 9. Clean up analytics
DO $$
BEGIN
    DELETE FROM analytics_daily 
    WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'analytics_daily table does not exist, skipping';
END $$;

DO $$
BEGIN
    DELETE FROM analytics_hourly 
    WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'analytics_hourly table does not exist, skipping';
END $$;

-- 10. Clean up agents
DO $$
BEGIN
    DELETE FROM agents 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'agents table does not exist, skipping';
END $$;

-- 11. Clean up users
DO $$
BEGIN
    DELETE FROM users 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'users table does not exist, skipping';
END $$;

-- 12. Clean up tenants (last due to FK constraints)
DO $$
BEGIN
    DELETE FROM tenants 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'tenants table does not exist, skipping';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check remaining placeholder data
    SELECT COUNT(*) INTO v_count FROM tenants WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
    RAISE NOTICE 'Remaining placeholder tenants: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM users WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
    RAISE NOTICE 'Remaining placeholder users: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM agents WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';
    RAISE NOTICE 'Remaining placeholder agents: %', v_count;
END $$;

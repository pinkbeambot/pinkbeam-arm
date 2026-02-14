-- Migration: 020_cleanup_placeholder_data
-- Description: Remove all placeholder/demo data with fake UUIDs

-- ============================================================================
-- DELETE PLACEHOLDER DATA
-- All records with IDs starting with '00000000-0000-0000-0000-00000000'
-- ============================================================================

-- Delete example escalations
DELETE FROM escalations 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example decisions
DELETE FROM decisions 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example activities
DELETE FROM activities 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example tasks
DELETE FROM tasks 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example agents (worker and system)
DELETE FROM agents 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example users
DELETE FROM users 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete demo tenant (must be last due to FK constraints)
DELETE FROM tenants 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- ============================================================================
-- CLEANUP NOTIFICATIONS (if table exists and has placeholder data)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications 
        WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%'
           OR tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';
    END IF;
END $$;

-- ============================================================================
-- CLEANUP CHAT DATA (if tables exist and have placeholder data)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chats') THEN
        DELETE FROM chat_messages 
        WHERE chat_id IN (
            SELECT id FROM chats 
            WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%'
        );
        
        DELETE FROM chats 
        WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%';
    END IF;
END $$;

-- ============================================================================
-- CLEANUP ANALYTICS (if tables exist and have placeholder data)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_hourly') THEN
        DELETE FROM analytics_hourly 
        WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_daily') THEN
        DELETE FROM analytics_daily 
        WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';
    END IF;
END $$;

-- ============================================================================
-- NOTE: We keep the seed data migration file (005_seed_data.sql) for reference
-- but this migration removes the actual placeholder records from the database.
-- Future new signups will create real tenants/users without placeholder IDs.
-- ============================================================================

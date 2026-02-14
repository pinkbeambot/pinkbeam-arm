-- Migration: 019_cleanup_placeholder_data
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

-- Delete example agent configurations
DELETE FROM agent_configs 
WHERE agent_id IN (
    SELECT id FROM agents 
    WHERE id::text LIKE '00000000-0000-0000-0000-00000000%'
);

-- Delete example agents (worker and system)
DELETE FROM agents 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example tenant memberships
DELETE FROM tenant_memberships 
WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example users
DELETE FROM users 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete example tenant settings
DELETE FROM tenant_settings 
WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete demo tenant (must be last due to FK constraints)
DELETE FROM tenants 
WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

-- ============================================================================
-- CLEANUP NOTIFICATIONS (if any placeholder data exists)
-- ============================================================================

DELETE FROM notifications 
WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%'
   OR tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- ============================================================================
-- CLEANUP CHAT DATA (if any placeholder data exists)
-- ============================================================================

DELETE FROM messages 
WHERE chat_id IN (
    SELECT id FROM chats 
    WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%'
);

DELETE FROM chats 
WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- ============================================================================
-- CLEANUP ANALYTICS (if any placeholder data exists)
-- ============================================================================

DELETE FROM analytics_hourly 
WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';

DELETE FROM analytics_daily 
WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- ============================================================================
-- NOTE: We keep the seed data migration file (005_seed_data.sql) for reference
-- but this migration removes the actual placeholder records from the database.
-- Future new signups will create real tenants/users without placeholder IDs.
-- ============================================================================

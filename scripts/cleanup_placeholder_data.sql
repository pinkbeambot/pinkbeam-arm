-- ============================================================================
-- CLEANUP PLACEHOLDER/DEMO DATA
-- Run this in Supabase Dashboard SQL Editor
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

-- Delete example agent relationships
DELETE FROM agent_relationships 
WHERE parent_id::text LIKE '00000000-0000-0000-0000-00000000%'
   OR child_id::text LIKE '00000000-0000-0000-0000-00000000%';

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

-- Delete placeholder notifications
DELETE FROM notifications 
WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%'
   OR tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete placeholder chat messages
DELETE FROM messages 
WHERE chat_id IN (
    SELECT id FROM chats 
    WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%'
);

-- Delete placeholder chats
DELETE FROM chats 
WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- Delete placeholder analytics
DELETE FROM analytics_hourly 
WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';

DELETE FROM analytics_daily 
WHERE tenant_id::text LIKE '00000000-0000-0000-0000-00000000%';

-- ============================================================================
-- VERIFICATION QUERY (run after cleanup to confirm)
-- ============================================================================

-- Check for any remaining placeholder data
SELECT 'Remaining placeholder tenants' as check_type, COUNT(*) as count FROM tenants WHERE id::text LIKE '00000000-0000-0000-0000-00000000%'
UNION ALL
SELECT 'Remaining placeholder users', COUNT(*) FROM users WHERE id::text LIKE '00000000-0000-0000-0000-00000000%'
UNION ALL
SELECT 'Remaining placeholder agents', COUNT(*) FROM agents WHERE id::text LIKE '00000000-0000-0000-0000-00000000%'
UNION ALL
SELECT 'Remaining placeholder tasks', COUNT(*) FROM tasks WHERE id::text LIKE '00000000-0000-0000-0000-00000000%'
UNION ALL
SELECT 'Remaining placeholder activities', COUNT(*) FROM activities WHERE id::text LIKE '00000000-0000-0000-0000-00000000%';

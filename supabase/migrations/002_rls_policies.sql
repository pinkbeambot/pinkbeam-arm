-- Migration: 002_rls_policies
-- Description: Row Level Security policies for multi-tenancy

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANTS
-- ============================================================================

-- Users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
    FOR ALL
    USING (id = current_setting('app.current_tenant')::UUID);

-- Allow initial tenant creation (during signup)
CREATE POLICY tenant_insert_during_signup ON tenants
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- USERS
-- ============================================================================

-- Tenant isolation
CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Users can see themselves even if tenant context not set
CREATE POLICY users_self_access ON users
    FOR SELECT
    USING (auth_id = auth.uid());

-- ============================================================================
-- AGENTS
-- ============================================================================

CREATE POLICY agents_tenant_isolation ON agents
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE POLICY tasks_tenant_isolation ON tasks
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- TASK DEPENDENCIES
-- ============================================================================

CREATE POLICY task_deps_tenant_isolation ON task_dependencies
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- DECISIONS
-- ============================================================================

CREATE POLICY decisions_tenant_isolation ON decisions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- ESCALATIONS
-- ============================================================================

CREATE POLICY escalations_tenant_isolation ON escalations
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- ACTIVITIES
-- ============================================================================

CREATE POLICY activities_tenant_isolation ON activities
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE POLICY messages_tenant_isolation ON messages
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- AGENT SESSIONS
-- ============================================================================

CREATE POLICY agent_sessions_tenant_isolation ON agent_sessions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

CREATE POLICY analytics_tenant_isolation ON analytics_daily
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- FILES
-- ============================================================================

CREATE POLICY files_tenant_isolation ON files
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- SERVICE ROLE BYPASS (for Edge Functions)
-- ============================================================================

-- Create a bypass policy for service role
CREATE POLICY service_role_bypass_tenants ON tenants
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_users ON users
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_agents ON agents
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_tasks ON tasks
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_decisions ON decisions
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_escalations ON escalations
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_activities ON activities
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_messages ON messages
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY service_role_bypass_analytics ON analytics_daily
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- HELPER FUNCTION: Set tenant context
-- ============================================================================

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

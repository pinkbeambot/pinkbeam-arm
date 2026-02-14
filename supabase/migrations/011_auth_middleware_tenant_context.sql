-- Migration: 011_auth_middleware_tenant_context
-- Description: Update RLS policies and add helper functions for auth middleware tenant context

-- ============================================================================
-- UPDATE RLS POLICIES TO USE TENANT CONTEXT
-- ============================================================================

-- First, drop existing policies that we want to update
DROP POLICY IF EXISTS tenant_isolation ON tenants;
DROP POLICY IF EXISTS tenant_insert_during_signup ON tenants;

-- ============================================================================
-- TENANTS TABLE - Updated Policies
-- ============================================================================

-- Users can only see their own tenant via context
CREATE POLICY tenant_isolation ON tenants
    FOR ALL
    USING (id = COALESCE(
        current_setting('app.current_tenant', true)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    ));

-- Allow initial tenant creation (during signup)
CREATE POLICY tenant_insert_during_signup ON tenants
    FOR INSERT
    WITH CHECK (true);

-- Users can see their tenant if they have a user record linking them
CREATE POLICY tenant_user_access ON tenants
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE users.tenant_id = tenants.id 
        AND users.auth_id = auth.uid()
    ));

-- ============================================================================
-- USERS TABLE - Updated Policies
-- ============================================================================

-- Drop and recreate users policies for consistency
DROP POLICY IF EXISTS users_tenant_isolation ON users;
DROP POLICY IF EXISTS users_self_access ON users;

CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    USING (tenant_id = COALESCE(
        current_setting('app.current_tenant', true)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    ));

-- Users can see themselves even if tenant context not set
CREATE POLICY users_self_access ON users
    FOR SELECT
    USING (auth_id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY users_self_update ON users
    FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTION: Get current tenant from context
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- Try to get from session config (set by middleware)
    BEGIN
        tenant_id := current_setting('app.current_tenant', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        tenant_id := NULL;
    END;
    
    -- If not in context, try to get from current user
    IF tenant_id IS NULL THEN
        SELECT users.tenant_id INTO tenant_id
        FROM users
        WHERE users.auth_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user belongs to tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION user_belongs_to_tenant(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    belongs BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM users 
        WHERE auth_id = p_user_id 
        AND tenant_id = p_tenant_id
    ) INTO belongs;
    
    RETURN belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Set tenant context with validation
-- ============================================================================

-- Drop old version with void return type
DROP FUNCTION IF EXISTS set_tenant_context(UUID);

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    is_service_role BOOLEAN;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if service role (bypass validation)
    is_service_role := current_setting('role', true) = 'service_role';
    
    -- If not service role, validate user belongs to tenant
    IF NOT is_service_role AND current_user_id IS NOT NULL THEN
        IF NOT user_belongs_to_tenant(current_user_id, p_tenant_id) THEN
            RAISE EXCEPTION 'User does not belong to tenant';
        END IF;
    END IF;
    
    -- Set the context
    PERFORM set_config('app.current_tenant', p_tenant_id::text, false);
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Log error and return false
    RAISE WARNING 'Failed to set tenant context: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get current user with tenant validation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_with_tenant()
RETURNS TABLE (
    user_id UUID,
    tenant_id UUID,
    email TEXT,
    role TEXT,
    capabilities TEXT[]
) AS $$
DECLARE
    ctx_tenant_id UUID;
    auth_user_id UUID;
BEGIN
    auth_user_id := auth.uid();
    
    -- Get tenant from context
    BEGIN
        ctx_tenant_id := current_setting('app.current_tenant', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        ctx_tenant_id := NULL;
    END;
    
    -- If no context tenant, get from user record
    IF ctx_tenant_id IS NULL THEN
        SELECT users.tenant_id INTO ctx_tenant_id
        FROM users
        WHERE users.auth_id = auth_user_id
        LIMIT 1;
        
        -- Set context for subsequent queries
        IF ctx_tenant_id IS NOT NULL THEN
            PERFORM set_config('app.current_tenant', ctx_tenant_id::text, false);
        END IF;
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.tenant_id,
        u.email,
        u.role,
        u.capabilities
    FROM users u
    WHERE u.auth_id = auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Auto-set tenant context on connection
-- ============================================================================

-- Function to set tenant context based on JWT claims
CREATE OR REPLACE FUNCTION auto_set_tenant_context()
RETURNS void AS $$
DECLARE
    jwt_tenant_id TEXT;
    jwt_user_id UUID;
BEGIN
    -- Try to extract tenant_id from JWT claims
    BEGIN
        jwt_tenant_id := current_setting('request.jwt.claims', true)::jsonb->>'tenant_id';
    EXCEPTION WHEN OTHERS THEN
        jwt_tenant_id := NULL;
    END;
    
    -- If tenant_id is in JWT, set it
    IF jwt_tenant_id IS NOT NULL AND jwt_tenant_id != '' THEN
        PERFORM set_config('app.current_tenant', jwt_tenant_id, false);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR AUTH QUERIES
-- ============================================================================

-- Ensure we have indexes for auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_auth ON users(tenant_id, auth_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_current_tenant() IS 'Retrieves the current tenant ID from context or user record';
COMMENT ON FUNCTION set_tenant_context(UUID) IS 'Sets the tenant context for RLS with validation';
COMMENT ON FUNCTION user_belongs_to_tenant(UUID, UUID) IS 'Checks if a user belongs to a specific tenant';
COMMENT ON FUNCTION get_current_user_with_tenant() IS 'Gets current user info with tenant validation and auto-context';
COMMENT ON FUNCTION auto_set_tenant_context() IS 'Auto-sets tenant context from JWT claims on connection';

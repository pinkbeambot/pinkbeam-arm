-- Migration: 018_rbac_enhancements
-- Description: Add RBAC enforcement tables and update user roles

-- ============================================================================
-- ENSURE ALL USERS HAVE A VALID ROLE
-- ============================================================================

-- Set default role for users without a role
UPDATE users 
SET role = 'member' 
WHERE role IS NULL OR role = '';

-- ============================================================================
-- TEAM INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Invitation details
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    
    -- Who created the invitation
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token for accepting invitation
    token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    
    -- Metadata
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_team_invitations_tenant ON team_invitations(tenant_id);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(tenant_id, status);

COMMENT ON TABLE team_invitations IS 'Pending team invitations for tenant members';

-- Trigger to update updated_at
CREATE TRIGGER update_team_invitations_updated_at 
    BEFORE UPDATE ON team_invitations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES FOR TEAM INVITATIONS
-- ============================================================================

-- Owners and admins can manage invitations
CREATE POLICY team_invitations_owner_admin ON team_invitations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.tenant_id = team_invitations.tenant_id 
            AND users.auth_id = auth.uid()
            AND users.role IN ('owner', 'admin')
        )
    );

-- Users can view their own invitations
CREATE POLICY team_invitations_self ON team_invitations
    FOR SELECT
    USING (email = (SELECT email FROM users WHERE auth_id = auth.uid()));

-- ============================================================================
-- FUNCTION: Get tenant members with roles
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_members(p_tenant_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    status TEXT,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.name,
        u.role,
        u.status,
        u.last_active_at,
        u.created_at
    FROM users u
    WHERE u.tenant_id = p_tenant_id
    ORDER BY 
        CASE u.role 
            WHEN 'owner' THEN 1 
            WHEN 'admin' THEN 2 
            WHEN 'member' THEN 3 
            WHEN 'viewer' THEN 4 
        END,
        u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Update user role (owner only)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_role(
    p_user_id UUID,
    p_new_role TEXT,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_user_role TEXT;
    v_target_user_tenant UUID;
BEGIN
    -- Get current user's role
    SELECT role INTO v_current_user_role
    FROM users
    WHERE auth_id = auth.uid()
    AND tenant_id = p_tenant_id;
    
    -- Only owners can update roles
    IF v_current_user_role != 'owner' THEN
        RAISE EXCEPTION 'Only owners can update user roles';
    END IF;
    
    -- Get target user's tenant
    SELECT tenant_id INTO v_target_user_tenant
    FROM users
    WHERE id = p_user_id;
    
    -- Ensure target user is in the same tenant
    IF v_target_user_tenant != p_tenant_id THEN
        RAISE EXCEPTION 'User does not belong to this tenant';
    END IF;
    
    -- Prevent changing owner's role (must transfer ownership first)
    IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'owner') THEN
        RAISE EXCEPTION 'Cannot change owner role directly. Transfer ownership first.';
    END IF;
    
    -- Validate new role
    IF p_new_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: %', p_new_role;
    END IF;
    
    -- Update role
    UPDATE users 
    SET role = p_new_role,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to update user role: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Remove user from tenant (owner only)
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_tenant_member(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_user_role TEXT;
    v_target_user_tenant UUID;
    v_is_owner BOOLEAN;
BEGIN
    -- Get current user's role
    SELECT role INTO v_current_user_role
    FROM users
    WHERE auth_id = auth.uid()
    AND tenant_id = p_tenant_id;
    
    -- Only owners can remove members
    IF v_current_user_role != 'owner' THEN
        RAISE EXCEPTION 'Only owners can remove team members';
    END IF;
    
    -- Get target user's tenant
    SELECT tenant_id, role = 'owner' INTO v_target_user_tenant, v_is_owner
    FROM users
    WHERE id = p_user_id;
    
    -- Ensure target user is in the same tenant
    IF v_target_user_tenant != p_tenant_id THEN
        RAISE EXCEPTION 'User does not belong to this tenant';
    END IF;
    
    -- Prevent removing the owner
    IF v_is_owner THEN
        RAISE EXCEPTION 'Cannot remove the owner. Transfer ownership first.';
    END IF;
    
    -- Soft delete by setting status to inactive
    UPDATE users 
    SET status = 'inactive',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to remove tenant member: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_tenant_members IS 'Returns all members of a tenant with their roles';
COMMENT ON FUNCTION update_user_role IS 'Updates a user role (owner only)';
COMMENT ON FUNCTION remove_tenant_member IS 'Removes a user from a tenant (owner only)';

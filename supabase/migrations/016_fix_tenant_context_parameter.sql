-- Migration: 016_fix_tenant_context_parameter
-- Description: Fix set_tenant_context function parameter name to match API usage

-- ============================================================================
-- FIX: Update set_tenant_context to use tenant_id parameter name
-- ============================================================================

-- The API routes call set_tenant_context with { tenant_id: tenantId }
-- Migration 002 used 'tenant_id' as parameter name
-- Migration 011 changed it to 'p_tenant_id' which broke the API calls
-- This migration restores the correct parameter name

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
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
        IF NOT user_belongs_to_tenant(current_user_id, tenant_id) THEN
            RAISE EXCEPTION 'User does not belong to tenant';
        END IF;
    END IF;
    
    -- Set the context
    PERFORM set_config('app.current_tenant', tenant_id::text, false);
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Log error and return false
    RAISE WARNING 'Failed to set tenant context: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON FUNCTION set_tenant_context(UUID) IS 'Sets the tenant context for RLS with validation. Parameter name must match API route usage (tenant_id).';

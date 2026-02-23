-- Migration: 013_tenant_settings_rate_limits
-- Description: Add tenant_settings table for per-tenant configuration including rate limits

-- ============================================================================
-- TENANT SETTINGS
-- ============================================================================

CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Rate limiting configuration
    rate_limit_requests_per_minute INTEGER NOT NULL DEFAULT 100,
    rate_limit_window_seconds INTEGER NOT NULL DEFAULT 60,
    rate_limit_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Feature flags and configuration
    config JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);

COMMENT ON TABLE tenant_settings IS 'Per-tenant configuration settings including rate limits';

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tenant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_settings_updated_at
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_settings_updated_at();

-- ============================================================================
-- FUNCTION: Get tenant rate limit with defaults
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_rate_limit(p_tenant_id UUID)
RETURNS TABLE (
    requests_per_minute INTEGER,
    window_seconds INTEGER,
    enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ts.rate_limit_requests_per_minute, 100),
        COALESCE(ts.rate_limit_window_seconds, 60),
        COALESCE(ts.rate_limit_enabled, true)
    FROM tenant_settings ts
    WHERE ts.tenant_id = p_tenant_id
    
    UNION ALL
    
    -- Default values if no settings exist
    SELECT 100, 60, true
    WHERE NOT EXISTS (
        SELECT 1 FROM tenant_settings WHERE tenant_id = p_tenant_id
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_rate_limit(UUID) IS 'Get rate limit configuration for a tenant with defaults';

-- ============================================================================
-- FUNCTION: Auto-create tenant settings on tenant creation
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_tenant_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_settings (
        tenant_id,
        rate_limit_requests_per_minute,
        rate_limit_window_seconds,
        rate_limit_enabled
    ) VALUES (
        NEW.id,
        100,  -- Default: 100 requests per minute
        60,   -- Default: 60 second window
        true  -- Default: enabled
    )
    ON CONFLICT (tenant_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_tenant_settings_trigger
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_tenant_settings();

COMMENT ON FUNCTION auto_create_tenant_settings() IS 'Automatically create default settings when a tenant is created';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own tenant settings
CREATE POLICY tenant_settings_select_policy ON tenant_settings
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Policy: Only tenant admins can update settings
CREATE POLICY tenant_settings_update_policy ON tenant_settings
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- SEED: Create settings for existing tenants
-- ============================================================================

INSERT INTO tenant_settings (
    tenant_id,
    rate_limit_requests_per_minute,
    rate_limit_window_seconds,
    rate_limit_enabled
)
SELECT 
    id as tenant_id,
    -- Use existing limits from tenants table if present, otherwise default to 100
    COALESCE((limits->>'rate_limit_requests_per_minute')::INTEGER, 100),
    COALESCE((limits->>'rate_limit_window_seconds')::INTEGER, 60),
    COALESCE((limits->>'rate_limit_enabled')::BOOLEAN, true)
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts WHERE ts.tenant_id = tenants.id
);

-- ============================================================================
-- NOTIFICATION TRIGGER: Log when rate limits are updated
-- ============================================================================

CREATE OR REPLACE FUNCTION log_rate_limit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.rate_limit_requests_per_minute != NEW.rate_limit_requests_per_minute OR
       OLD.rate_limit_enabled != NEW.rate_limit_enabled THEN
        
        INSERT INTO activities (
            tenant_id,
            entity_type,
            entity_id,
            activity_type,
            title,
            description,
            metadata
        ) VALUES (
            NEW.tenant_id,
            'system',
            NEW.id,
            'system.config_changed',
            'Rate limit configuration updated',
            format('Rate limit changed from %s to %s req/min (enabled: %s)',
                OLD.rate_limit_requests_per_minute,
                NEW.rate_limit_requests_per_minute,
                NEW.rate_limit_enabled
            ),
            jsonb_build_object(
                'old_requests_per_minute', OLD.rate_limit_requests_per_minute,
                'new_requests_per_minute', NEW.rate_limit_requests_per_minute,
                'old_enabled', OLD.rate_limit_enabled,
                'new_enabled', NEW.rate_limit_enabled
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_rate_limit_changes_trigger
    AFTER UPDATE ON tenant_settings
    FOR EACH ROW
    WHEN (OLD.rate_limit_requests_per_minute IS DISTINCT FROM NEW.rate_limit_requests_per_minute OR
          OLD.rate_limit_enabled IS DISTINCT FROM NEW.rate_limit_enabled)
    EXECUTE FUNCTION log_rate_limit_changes();

COMMENT ON FUNCTION log_rate_limit_changes() IS 'Log activity when rate limit settings change';

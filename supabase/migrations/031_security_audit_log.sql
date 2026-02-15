-- ============================================================================
-- Security Audit Log Table
-- ============================================================================
-- Tracks security-relevant events for compliance and threat detection

CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT, -- Can be null for unauthenticated attempts
    
    -- Event details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id TEXT,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    
    -- Event payload (sanitized)
    details JSONB DEFAULT '{}',
    
    -- Risk indicators
    risk_score INTEGER DEFAULT 0, -- 0-100
    risk_factors TEXT[], -- Array of detected risk factors
    
    -- Result
    success BOOLEAN DEFAULT true,
    error_code VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_security_audit_tenant ON security_audit_log(tenant_id);
CREATE INDEX idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_action ON security_audit_log(action);
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_ip ON security_audit_log(ip_address);
CREATE INDEX idx_security_audit_resource ON security_audit_log(resource_type, resource_id);

-- Partial index for failed/suspicious events
CREATE INDEX idx_security_audit_suspicious ON security_audit_log(tenant_id, created_at) 
    WHERE success = false OR risk_score > 50;

COMMENT ON TABLE security_audit_log IS 'Security audit trail for compliance and threat detection';

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own audit logs
CREATE POLICY security_audit_tenant_isolation ON security_audit_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- Cleanup Function
-- ============================================================================

-- Automatically purge old audit logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM security_audit_log
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Permissions
-- ============================================================================

GRANT ALL ON security_audit_log TO authenticated;
GRANT ALL ON security_audit_log TO service_role;

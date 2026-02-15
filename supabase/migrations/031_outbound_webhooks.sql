-- Migration: 031_outbound_webhooks
-- Description: Outbound webhook endpoints and delivery tracking for tenant integrations

-- ============================================================================
-- WEBHOOK ENDPOINTS TABLE
-- ============================================================================
-- Tenants register URLs to receive events from ARM

CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Endpoint configuration
    url TEXT NOT NULL,
    description TEXT,

    -- Event filtering
    events TEXT[] NOT NULL DEFAULT '{}', -- e.g. {'agent.status_changed', 'task.completed'}

    -- Security
    secret TEXT NOT NULL, -- Used to generate HMAC-SHA256 signature
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Failure tracking
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    disabled_at TIMESTAMPTZ, -- Auto-disabled after too many failures
    disabled_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(tenant_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_endpoints_tenant_isolation ON webhook_endpoints
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_webhook_endpoints ON webhook_endpoints
    FOR ALL
    TO service_role
    USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_webhook_endpoints_updated_at
    BEFORE UPDATE ON webhook_endpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE
-- ============================================================================
-- Logs every delivery attempt for debugging and retry

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,

    -- Event details
    event_type TEXT NOT NULL,
    event_id TEXT NOT NULL, -- Idempotency key for receivers
    payload JSONB NOT NULL,

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired')),

    -- Response tracking
    response_status INTEGER,   -- HTTP status code
    response_body TEXT,        -- Truncated response (first 1KB)
    response_time_ms INTEGER,  -- Latency

    -- Retry tracking
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    last_attempted_at TIMESTAMPTZ,

    -- Error
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id);
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(tenant_id, created_at DESC);

-- RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_webhook_deliveries ON webhook_deliveries
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- REALTIME SUPPORT
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE webhook_deliveries;

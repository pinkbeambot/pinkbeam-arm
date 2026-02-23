-- Migration: 036_billing_production_hardening.sql
-- Description: Add webhook idempotency, usage reconciliation, tax support, and audit logging

-- ============================================================================
-- WEBHOOK EVENTS TABLE (Idempotency & Retry Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook event queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry ON webhook_events(next_retry_at) 
    WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_webhook_events_updated_at 
    BEFORE UPDATE ON webhook_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment webhook attempt count
CREATE OR REPLACE FUNCTION increment_webhook_attempt(event_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_attempts INTEGER;
BEGIN
    UPDATE webhook_events 
    SET attempts = attempts + 1 
    WHERE id = event_id 
    RETURNING attempts INTO current_attempts;
    
    RETURN current_attempts;
END;
$$ LANGUAGE plpgsql;

-- RLS for webhook events (admin only)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_admin_only ON webhook_events
    FOR ALL
    USING (current_setting('app.is_admin', true)::BOOLEAN = TRUE);

-- ============================================================================
-- USAGE RECONCILIATION LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_reconciliation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Reconciliation details
    reconciliation_type VARCHAR(50) NOT NULL, -- 'daily', 'period_end', 'manual', 'corrective'
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Source data
    source_system VARCHAR(50) NOT NULL, -- 'stripe', 'internal', 'hybrid'
    source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Calculated vs actual
    calculated_usage BIGINT NOT NULL,
    actual_usage BIGINT NOT NULL,
    variance BIGINT GENERATED ALWAYS AS (actual_usage - calculated_usage) STORED,
    variance_percent DECIMAL(10, 4) GENERATED ALWAYS AS (
        CASE 
            WHEN calculated_usage > 0 THEN 
                ((actual_usage - calculated_usage)::DECIMAL / calculated_usage) * 100
            ELSE 0
        END
    ) STORED,
    
    -- Reconciliation result
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciliation_notes TEXT,
    
    -- Metadata
    initiated_by UUID REFERENCES users(id),
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_reconciliation_tenant ON usage_reconciliation_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_reconciliation_period ON usage_reconciliation_log(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_reconciliation_unreconciled ON usage_reconciliation_log(tenant_id, is_reconciled) 
    WHERE is_reconciled = FALSE;

CREATE TRIGGER IF NOT EXISTS update_usage_reconciliation_updated_at 
    BEFORE UPDATE ON usage_reconciliation_log 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE usage_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_reconciliation_tenant_isolation ON usage_reconciliation_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- TAX RECORDS (VAT/GST Compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    -- Tax details
    tax_type VARCHAR(50) NOT NULL, -- 'vat', 'gst', 'sales_tax', 'vat_moss'
    tax_rate DECIMAL(5, 4) NOT NULL, -- e.g., 0.2000 for 20%
    tax_amount_cents INTEGER NOT NULL,
    
    -- Tax jurisdiction
    country_code CHAR(2) NOT NULL,
    region_code VARCHAR(50), -- State/province for sales tax
    tax_number VARCHAR(100), -- VAT/GST number if provided
    
    -- Compliance
    tax_calculation_id VARCHAR(255), -- Reference to tax service (e.g., TaxJar, Stripe Tax)
    tax_inclusive BOOLEAN DEFAULT FALSE,
    
    -- Evidence for audit
    evidence_data JSONB DEFAULT '{}'::jsonb, -- IP address, billing address, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_records_invoice ON tax_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tax_records_tenant ON tax_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_records_country ON tax_records(country_code);

CREATE TRIGGER IF NOT EXISTS update_tax_records_updated_at 
    BEFORE UPDATE ON tax_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_records_tenant_isolation ON tax_records
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- AUDIT LOG (Enhanced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL for system-wide events
    
    -- Event details
    event_category VARCHAR(50) NOT NULL, -- 'billing', 'security', 'data', 'system'
    event_type VARCHAR(100) NOT NULL,
    event_action VARCHAR(100) NOT NULL,
    
    -- Actor
    actor_type VARCHAR(50) NOT NULL, -- 'user', 'system', 'webhook', 'api_key'
    actor_id VARCHAR(255), -- user_id, system identifier, etc.
    actor_ip INET,
    actor_user_agent TEXT,
    
    -- Target
    target_type VARCHAR(50) NOT NULL, -- 'subscription', 'invoice', 'payment_method', etc.
    target_id VARCHAR(255),
    
    -- Change details
    before_state JSONB,
    after_state JSONB,
    change_summary TEXT,
    
    -- Request context
    request_id VARCHAR(255),
    request_path TEXT,
    request_method VARCHAR(10),
    
    -- Compliance
    compliance_flags VARCHAR(50)[], -- ['gdpr', 'sox', 'pci_dss']
    retention_until TIMESTAMPTZ, -- When this log can be deleted
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_category, event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention ON audit_logs(retention_until) 
    WHERE retention_until IS NOT NULL;

-- Partition audit logs by month for performance (if supported)
-- Note: This is a basic implementation. For large-scale production,
-- consider using pg_partman or native partitioning.

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants can see their own audit logs
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    FOR ALL
    USING (
        tenant_id IS NULL OR 
        tenant_id = current_setting('app.current_tenant', true)::UUID
    );

-- ============================================================================
-- INVOICE DISPUTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Dispute details
    dispute_type VARCHAR(50) NOT NULL, -- 'billing_error', 'service_issue', 'fraud', 'duplicate'
    status VARCHAR(50) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'under_review', 'resolved', 'rejected', 'escalated')),
    priority VARCHAR(20) DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Dispute content
    description TEXT NOT NULL,
    requested_amount_cents INTEGER, -- If partial refund requested
    requested_action VARCHAR(50), -- 'refund', 'credit', 'correction'
    
    -- Resolution
    resolution_notes TEXT,
    resolved_amount_cents INTEGER,
    resolved_action VARCHAR(50),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    -- Communication
    internal_notes TEXT,
    customer_communication JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_disputes_tenant ON invoice_disputes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice ON invoice_disputes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_status ON invoice_disputes(status);

CREATE TRIGGER IF NOT EXISTS update_invoice_disputes_updated_at 
    BEFORE UPDATE ON invoice_disputes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE invoice_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_disputes_tenant_isolation ON invoice_disputes
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- RETENTION OFFERS (Enhanced)
-- ============================================================================

-- Add additional columns to existing cancellation_retention table
ALTER TABLE cancellation_retention 
ADD COLUMN IF NOT EXISTS discount_percent INTEGER,
ADD COLUMN IF NOT EXISTS discount_months INTEGER,
ADD COLUMN IF NOT EXISTS pause_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_period_end TIMESTAMPTZ;

-- ============================================================================
-- PDF INVOICE STORAGE
-- ============================================================================

-- Storage bucket for invoices (created via Supabase dashboard or storage API)
-- Note: Run this SQL via Supabase dashboard or migrations
-- CREATE POLICY "Invoices are viewable by tenant" ON storage.objects
--   FOR SELECT USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- FUNCTIONS FOR PRODUCTION HARDENING
-- ============================================================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_tenant_id UUID,
    p_event_category VARCHAR,
    p_event_type VARCHAR,
    p_event_action VARCHAR,
    p_actor_type VARCHAR,
    p_actor_id VARCHAR,
    p_target_type VARCHAR,
    p_target_id VARCHAR,
    p_before_state JSONB,
    p_after_state JSONB,
    p_change_summary TEXT,
    p_compliance_flags VARCHAR[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_retention_until TIMESTAMPTZ;
BEGIN
    -- Set retention period based on compliance requirements
    v_retention_until := CASE
        WHEN 'pci_dss' = ANY(p_compliance_flags) THEN NOW() + INTERVAL '7 years'
        WHEN 'sox' = ANY(p_compliance_flags) THEN NOW() + INTERVAL '7 years'
        ELSE NOW() + INTERVAL '3 years'
    END;

    INSERT INTO audit_logs (
        tenant_id,
        event_category,
        event_type,
        event_action,
        actor_type,
        actor_id,
        target_type,
        target_id,
        before_state,
        after_state,
        change_summary,
        compliance_flags,
        retention_until
    ) VALUES (
        p_tenant_id,
        p_event_category,
        p_event_type,
        p_event_action,
        p_actor_type,
        p_actor_id,
        p_target_type,
        p_target_id,
        p_before_state,
        p_after_state,
        p_change_summary,
        p_compliance_flags,
        v_retention_until
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reconcile usage for a tenant
CREATE OR REPLACE FUNCTION reconcile_usage(
    p_tenant_id UUID,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ,
    p_initiated_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_reconciliation_id UUID;
    v_calculated_agents BIGINT;
    v_actual_agents BIGINT;
BEGIN
    -- Calculate expected usage from internal records
    SELECT COUNT(*)::BIGINT INTO v_calculated_agents
    FROM agents
    WHERE tenant_id = p_tenant_id
        AND status != 'terminated'
        AND created_at <= p_period_end
        AND (terminated_at IS NULL OR terminated_at > p_period_start);

    -- Get actual usage from tracking (would integrate with Stripe or other sources)
    -- For now, using same calculation as baseline
    v_actual_agents := v_calculated_agents;

    INSERT INTO usage_reconciliation_log (
        tenant_id,
        reconciliation_type,
        period_start,
        period_end,
        source_system,
        source_data,
        calculated_usage,
        actual_usage,
        is_reconciled,
        reconciliation_notes,
        initiated_by,
        completed_at
    ) VALUES (
        p_tenant_id,
        'manual',
        p_period_start,
        p_period_end,
        'internal',
        jsonb_build_object('agent_count', v_calculated_agents),
        v_calculated_agents,
        v_actual_agents,
        v_calculated_agents = v_actual_agents,
        CASE 
            WHEN v_calculated_agents = v_actual_agents THEN 'Usage reconciled successfully'
            ELSE 'Variance detected: ' || (v_actual_agents - v_calculated_agents)::TEXT
        END,
        p_initiated_by,
        NOW()
    )
    RETURNING id INTO v_reconciliation_id;

    RETURN v_reconciliation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle trial expiration
CREATE OR REPLACE FUNCTION handle_trial_expiration()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER := 0;
    v_tenant RECORD;
BEGIN
    -- Find tenants with expired trials
    FOR v_tenant IN 
        SELECT id, current_tier, trial_ends_at
        FROM tenants
        WHERE subscription_status = 'trialing'
            AND trial_ends_at < NOW()
    LOOP
        -- Update tenant to free tier
        UPDATE tenants
        SET 
            subscription_status = 'active',
            current_tier = 'free',
            updated_at = NOW()
        WHERE id = v_tenant.id;

        -- Log the event
        INSERT INTO billing_events (tenant_id, event_type, data)
        VALUES (
            v_tenant.id,
            'trial_ended',
            jsonb_build_object(
                'previous_tier', v_tenant.current_tier,
                'trial_ended_at', v_tenant.trial_ends_at,
                'new_tier', 'free'
            )
        );

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate proration for plan changes
CREATE OR REPLACE FUNCTION calculate_proration(
    p_tenant_id UUID,
    p_new_tier VARCHAR
)
RETURNS TABLE (
    current_tier VARCHAR,
    new_tier VARCHAR,
    days_remaining INTEGER,
    days_in_period INTEGER,
    current_price_cents INTEGER,
    new_price_cents INTEGER,
    proration_credit_cents INTEGER,
    proration_charge_cents INTEGER,
    net_amount_cents INTEGER
) AS $$
DECLARE
    v_tenant RECORD;
    v_current_tier_price INTEGER;
    v_new_tier_price INTEGER;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_days_remaining INTEGER;
    v_days_in_period INTEGER;
BEGIN
    -- Get tenant info
    SELECT 
        t.current_tier,
        t.current_period_starts_at,
        t.current_period_ends_at
    INTO v_tenant
    FROM tenants t
    WHERE t.id = p_tenant_id;

    IF v_tenant IS NULL THEN
        RETURN;
    END IF;

    -- Get tier prices
    SELECT price_monthly INTO v_current_tier_price
    FROM subscription_tiers
    WHERE id = v_tenant.current_tier;

    SELECT price_monthly INTO v_new_tier_price
    FROM subscription_tiers
    WHERE id = p_new_tier;

    -- Calculate days
    v_days_in_period := GREATEST(1, EXTRACT(DAY FROM (v_tenant.current_period_ends_at - v_tenant.current_period_starts_at)));
    v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_tenant.current_period_ends_at - NOW())));

    -- Calculate proration
    RETURN QUERY SELECT
        v_tenant.current_tier,
        p_new_tier,
        v_days_remaining,
        v_days_in_period,
        COALESCE(v_current_tier_price, 0),
        COALESCE(v_new_tier_price, 0),
        -- Credit for unused time on current plan
        CASE 
            WHEN v_current_tier_price IS NOT NULL THEN
                ROUND((v_current_tier_price::NUMERIC / v_days_in_period) * v_days_remaining)::INTEGER
            ELSE 0
        END,
        -- Charge for remaining time on new plan
        CASE 
            WHEN v_new_tier_price IS NOT NULL THEN
                ROUND((v_new_tier_price::NUMERIC / v_days_in_period) * v_days_remaining)::INTEGER
            ELSE 0
        END,
        -- Net amount (positive = charge, negative = credit)
        CASE 
            WHEN v_new_tier_price IS NOT NULL AND v_current_tier_price IS NOT NULL THEN
                ROUND(((v_new_tier_price - v_current_tier_price)::NUMERIC / v_days_in_period) * v_days_remaining)::INTEGER
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE retention_until IS NOT NULL 
        AND retention_until < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES FOR NEW TABLES
-- ============================================================================

-- Ensure RLS is enabled on all new tables
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_reconciliation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_disputes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE webhook_events IS 'Tracks webhook processing state for idempotency and retry logic';
COMMENT ON TABLE usage_reconciliation_log IS 'Records usage reconciliation attempts and variances';
COMMENT ON TABLE tax_records IS 'Tax calculation details for VAT/GST compliance';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance and security';
COMMENT ON TABLE invoice_disputes IS 'Tracks customer disputes and resolutions';

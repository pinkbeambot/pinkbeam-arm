-- Migration: 035_billing_enhancements.sql
-- Description: Add usage tracking, subscription management, invoice line items, and payment method enhancements

-- ============================================================================
-- USAGE TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Usage metrics
    metric_type VARCHAR(50) NOT NULL, -- 'agent', 'task', 'storage', 'llm_tokens', 'api_calls', etc.
    metric_name VARCHAR(100) NOT NULL, -- 'agents_created', 'tasks_completed', 'storage_used_mb', etc.
    
    -- Usage values
    usage_count BIGINT NOT NULL DEFAULT 0,
    usage_cost_cents INTEGER DEFAULT 0, -- Cost in cents for this usage
    
    -- Time tracking
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage tracking queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant ON usage_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_period ON usage_tracking(tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_metric ON usage_tracking(tenant_id, metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_recorded ON usage_tracking(recorded_at DESC);

-- RLS policies for usage tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_tracking_tenant_isolation ON usage_tracking
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- USAGE ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Alert configuration
    alert_type VARCHAR(50) NOT NULL, -- 'usage_threshold', 'cost_threshold', 'limit_approaching'
    metric_type VARCHAR(50) NOT NULL, -- 'agent', 'task', 'storage', 'cost'
    threshold_percent INTEGER NOT NULL, -- 0-100
    
    -- Alert status
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    
    -- Notification tracking
    notification_sent_at TIMESTAMPTZ,
    notification_channels TEXT[], -- ['email', 'in_app', 'slack']
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_alerts_tenant ON usage_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_triggered ON usage_alerts(tenant_id, is_triggered) WHERE is_triggered = TRUE;

ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_alerts_tenant_isolation ON usage_alerts
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- SUBSCRIPTION CHANGES TABLE (for tracking upgrades/downgrades)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Change details
    change_type VARCHAR(50) NOT NULL, -- 'upgrade', 'downgrade', 'cancellation', 'reactivation'
    previous_tier VARCHAR(50) NOT NULL,
    new_tier VARCHAR(50) NOT NULL,
    
    -- Proration details
    proration_date TIMESTAMPTZ,
    proration_credit_cents INTEGER, -- Credit applied
    proration_charge_cents INTEGER, -- Additional charge
    
    -- Stripe references
    stripe_subscription_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    
    -- Change status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'applied', 'failed', 'rolled_back'
    applied_at TIMESTAMPTZ,
    
    -- Metadata
    initiated_by UUID REFERENCES users(id),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_changes_tenant ON subscription_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_created ON subscription_changes(created_at DESC);

ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_changes_tenant_isolation ON subscription_changes
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- CANCELLATION RETENTION ATTEMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cancellation_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Cancellation details
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    initiated_by UUID REFERENCES users(id),
    
    -- Retention flow
    retention_offered BOOLEAN DEFAULT FALSE,
    retention_offer_type VARCHAR(50), -- 'discount', 'extended_trial', 'pause', 'downgrade'
    retention_offer_details JSONB,
    
    -- User response
    user_response VARCHAR(50), -- 'accepted', 'declined', 'pending'
    responded_at TIMESTAMPTZ,
    
    -- Final outcome
    final_status VARCHAR(50), -- 'retained', 'cancelled', 'paused'
    completed_at TIMESTAMPTZ,
    
    -- Feedback
    cancellation_reason TEXT,
    feedback_survey JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_retention_tenant ON cancellation_retention(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_retention_status ON cancellation_retention(final_status) WHERE final_status IS NULL;

ALTER TABLE cancellation_retention ENABLE ROW LEVEL SECURITY;

CREATE POLICY cancellation_retention_tenant_isolation ON cancellation_retention
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- INVOICE LINE ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Line item details
    stripe_line_item_id VARCHAR(255),
    description TEXT NOT NULL,
    
    -- Pricing
    amount_cents INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price_cents INTEGER,
    
    -- Categorization
    item_type VARCHAR(50), -- 'subscription', 'usage', 'proration', 'discount', 'tax'
    feature_code VARCHAR(100), -- 'agents', 'tasks', 'storage', 'api_calls'
    
    -- Usage details (for usage-based billing)
    usage_quantity DECIMAL(12,4),
    usage_unit VARCHAR(50), -- 'agent', 'task', 'mb', 'token', 'call'
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant ON invoice_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_type ON invoice_line_items(item_type);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_line_items_tenant_isolation ON invoice_line_items
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- ENHANCED PAYMENT METHODS TABLE
-- ============================================================================

-- Add new columns to existing payment_methods table
ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' 
    CHECK (status IN ('active', 'expired', 'expiring_soon', 'failed', 'removed')),
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS failure_message TEXT,
ADD COLUMN IF NOT EXISTS auto_update_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS network_transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS setup_future_usage VARCHAR(50);

-- Payment method audit log
CREATE TABLE IF NOT EXISTS payment_method_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'expired', 'failed', 'succeeded', 'auto_updated'
    event_data JSONB DEFAULT '{}'::jsonb,
    
    stripe_event_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_method_events_payment_method ON payment_method_events(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_events_tenant ON payment_method_events(tenant_id);

ALTER TABLE payment_method_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_method_events_tenant_isolation ON payment_method_events
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- FAILED PAYMENT HANDLING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS failed_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Payment details
    stripe_invoice_id VARCHAR(255) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),
    
    -- Failure details
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    -- Retry tracking
    attempt_number INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 4,
    next_retry_at TIMESTAMPTZ,
    
    -- Resolution
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'retrying', 'resolved', 'finalized', 'forgiven'
    resolved_at TIMESTAMPTZ,
    resolution_type VARCHAR(50), -- 'retry_success', 'new_payment_method', 'manual_payment', 'forgiven'
    
    -- Dunning communication
    dunning_email_sent_at TIMESTAMPTZ,
    dunning_email_opened_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_payments_tenant ON failed_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_failed_payments_status ON failed_payments(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_failed_payments_next_retry ON failed_payments(next_retry_at) WHERE status IN ('pending', 'retrying');

ALTER TABLE failed_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY failed_payments_tenant_isolation ON failed_payments
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- PDF INVOICE GENERATION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS generated_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Generation details
    pdf_url TEXT,
    storage_path TEXT, -- If stored in Supabase storage
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),
    
    -- PDF metadata
    file_size_bytes INTEGER,
    page_count INTEGER,
    
    -- Download tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_invoices_invoice ON generated_invoices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_generated_invoices_tenant ON generated_invoices(tenant_id);

ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY generated_invoices_tenant_isolation ON generated_invoices
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- FUNCTIONS FOR ENHANCED BILLING
-- ============================================================================

-- Function to record usage
CREATE OR REPLACE FUNCTION record_usage(
    p_tenant_id UUID,
    p_metric_type VARCHAR,
    p_metric_name VARCHAR,
    p_usage_count BIGINT,
    p_usage_cost_cents INTEGER DEFAULT 0,
    p_period_start TIMESTAMPTZ DEFAULT NOW(),
    p_period_end TIMESTAMPTZ DEFAULT NOW(),
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_usage_id UUID;
BEGIN
    INSERT INTO usage_tracking (
        tenant_id,
        metric_type,
        metric_name,
        usage_count,
        usage_cost_cents,
        period_start,
        period_end,
        metadata
    ) VALUES (
        p_tenant_id,
        p_metric_type,
        p_metric_name,
        p_usage_count,
        p_usage_cost_cents,
        p_period_start,
        p_period_end,
        p_metadata
    )
    RETURNING id INTO v_usage_id;
    
    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get usage summary for period
CREATE OR REPLACE FUNCTION get_usage_summary(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    metric_type VARCHAR,
    metric_name VARCHAR,
    total_usage BIGINT,
    total_cost_cents BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.metric_type,
        ut.metric_name,
        COALESCE(SUM(ut.usage_count), 0)::BIGINT as total_usage,
        COALESCE(SUM(ut.usage_cost_cents), 0)::BIGINT as total_cost_cents
    FROM usage_tracking ut
    WHERE ut.tenant_id = p_tenant_id
        AND ut.period_start >= p_start_date
        AND ut.period_end <= p_end_date
    GROUP BY ut.metric_type, ut.metric_name
    ORDER BY total_cost_cents DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and trigger usage alerts
CREATE OR REPLACE FUNCTION check_usage_alerts(p_tenant_id UUID)
RETURNS TABLE (
    alert_id UUID,
    alert_type VARCHAR,
    metric_type VARCHAR,
    threshold_percent INTEGER,
    current_percent INTEGER,
    is_triggered BOOLEAN
) AS $$
DECLARE
    v_usage RECORD;
    v_limit INTEGER;
    v_current BIGINT;
    v_percent INTEGER;
BEGIN
    -- Check agent usage
    SELECT COALESCE(st.agent_limit, 1) INTO v_limit
    FROM tenants t
    LEFT JOIN subscription_tiers st ON st.id = t.current_tier
    WHERE t.id = p_tenant_id;
    
    SELECT COUNT(*)::BIGINT INTO v_current
    FROM agents
    WHERE tenant_id = p_tenant_id AND status != 'terminated';
    
    IF v_limit IS NOT NULL THEN
        v_percent := LEAST(100, (v_current::FLOAT / v_limit * 100)::INTEGER);
        
        RETURN QUERY
        SELECT 
            ua.id,
            ua.alert_type,
            ua.metric_type,
            ua.threshold_percent,
            v_percent,
            (v_percent >= ua.threshold_percent) as is_triggered
        FROM usage_alerts ua
        WHERE ua.tenant_id = p_tenant_id
            AND ua.metric_type = 'agent'
            AND ua.is_triggered = FALSE
            AND v_percent >= ua.threshold_percent;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update payment method status based on expiration
CREATE OR REPLACE FUNCTION update_payment_method_expiration()
RETURNS void AS $$
BEGIN
    -- Mark cards expiring this month or already expired
    UPDATE payment_methods
    SET status = CASE
        WHEN (card_exp_year < EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
            OR (card_exp_year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER 
                AND card_exp_month < EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER)
        THEN 'expired'
        WHEN (card_exp_year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER 
              AND card_exp_month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER)
        THEN 'expiring_soon'
        ELSE status
    END
    WHERE type = 'card'
        AND status IN ('active', 'expiring_soon');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for updating timestamps
CREATE TRIGGER IF NOT EXISTS update_usage_alerts_updated_at 
    BEFORE UPDATE ON usage_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_subscription_changes_updated_at 
    BEFORE UPDATE ON subscription_changes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_cancellation_retention_updated_at 
    BEFORE UPDATE ON cancellation_retention 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_failed_payments_updated_at 
    BEFORE UPDATE ON failed_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT ALERTS FOR NEW TENANTS
-- ============================================================================

-- Function to create default usage alerts for new tenants
CREATE OR REPLACE FUNCTION create_default_usage_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default alerts for 80% and 100% usage
    INSERT INTO usage_alerts (tenant_id, alert_type, metric_type, threshold_percent)
    VALUES 
        (NEW.id, 'usage_threshold', 'agent', 80),
        (NEW.id, 'usage_threshold', 'agent', 95),
        (NEW.id, 'usage_threshold', 'storage', 80),
        (NEW.id, 'usage_threshold', 'storage', 95);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to tenants table (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'create_default_alerts_trigger' 
        AND tgrelid = 'tenants'::regclass
    ) THEN
        CREATE TRIGGER create_default_alerts_trigger
            AFTER INSERT ON tenants
            FOR EACH ROW
            EXECUTE FUNCTION create_default_usage_alerts();
    END IF;
END $$;

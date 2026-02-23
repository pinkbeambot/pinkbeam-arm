-- Migration: 030_add_subscription_billing.sql
-- Description: Add Stripe billing fields to tenants table for subscription management

-- ============================================================================
-- ADD SUBSCRIPTION FIELDS TO TENANTS
-- ============================================================================

-- Add billing-related columns to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trialing' 
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
ADD COLUMN IF NOT EXISTS current_tier VARCHAR(50) DEFAULT 'starter'
    CHECK (current_tier IN ('starter', 'pro', 'business', 'scale')),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_starts_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN tenants.stripe_customer_id IS 'Stripe Customer ID for billing';
COMMENT ON COLUMN tenants.stripe_subscription_id IS 'Stripe Subscription ID for current plan';
COMMENT ON COLUMN tenants.stripe_price_id IS 'Stripe Price ID for the current tier';
COMMENT ON COLUMN tenants.subscription_status IS 'Current subscription status (trialing, active, past_due, etc.)';
COMMENT ON COLUMN tenants.current_tier IS 'Current pricing tier (starter, pro, business, scale)';
COMMENT ON COLUMN tenants.trial_ends_at IS 'End date of trial period';
COMMENT ON COLUMN tenants.current_period_starts_at IS 'Current billing period start';
COMMENT ON COLUMN tenants.current_period_ends_at IS 'Current billing period end';
COMMENT ON COLUMN tenants.cancel_at_period_end IS 'Whether subscription will cancel at period end';

-- Create indexes for billing lookups
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription ON tenants(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends ON tenants(trial_ends_at) WHERE subscription_status = 'trialing';

-- ============================================================================
-- SUBSCRIPTION TIER CONFIGURATION
-- ============================================================================

-- Create a table for tier configuration (allows easy modification without code changes)
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id VARCHAR(50) PRIMARY KEY, -- starter, pro, business, scale
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stripe_price_id VARCHAR(255) NOT NULL, -- Test mode price ID
    stripe_price_id_live VARCHAR(255), -- Production price ID
    price_monthly INTEGER NOT NULL, -- Price in cents
    agent_limit INTEGER NOT NULL, -- Max agents allowed
    task_limit INTEGER, -- NULL means unlimited
    storage_limit_mb INTEGER, -- Storage limit in MB
    features JSONB DEFAULT '[]'::jsonb, -- Array of feature flags
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_subscription_tiers_updated_at 
    BEFORE UPDATE ON subscription_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default tiers
INSERT INTO subscription_tiers (id, name, description, stripe_price_id, price_monthly, agent_limit, task_limit, storage_limit_mb, features, sort_order)
VALUES 
    ('starter', 'Starter', 'Perfect for solo founders getting started with AI agents', 'price_starter_test', 4900, 3, 1000, 1000, '["basic_agents", "email_support", "api_access"]', 1),
    ('pro', 'Pro', 'For growing teams that need more agents and advanced features', 'price_pro_test', 19900, 10, 10000, 5000, '["basic_agents", "advanced_agents", "priority_support", "api_access", "custom_tools", "analytics"]', 2),
    ('business', 'Business', 'For established businesses with complex agent workflows', 'price_business_test', 49900, 25, 50000, 25000, '["basic_agents", "advanced_agents", "priority_support", "api_access", "custom_tools", "analytics", "sso", "dedicated_support"]', 3),
    ('scale', 'Scale', 'Unlimited agents for enterprises scaling AI across their organization', 'price_scale_test', 99900, NULL, NULL, NULL, '["basic_agents", "advanced_agents", "priority_support", "api_access", "custom_tools", "analytics", "sso", "dedicated_support", "custom_contracts", "sla"]', 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    agent_limit = EXCLUDED.agent_limit,
    task_limit = EXCLUDED.task_limit,
    storage_limit_mb = EXCLUDED.storage_limit_mb,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- BILLING EVENTS LOG
-- ============================================================================

-- Create a table for billing event history
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- trial_started, subscription_created, payment_succeeded, etc.
    stripe_event_id VARCHAR(255), -- Stripe event ID for reference
    stripe_event_type VARCHAR(100), -- Stripe event type (checkout.session.completed, etc.)
    data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Event payload
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event ON billing_events(stripe_event_id);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255),
    amount_due INTEGER NOT NULL, -- Amount in cents
    amount_paid INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL, -- draft, open, paid, uncollectible, void
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);

-- ============================================================================
-- FUNCTIONS FOR BILLING
-- ============================================================================

-- Function to get tenant usage (agent count, etc.)
CREATE OR REPLACE FUNCTION get_tenant_usage(p_tenant_id UUID)
RETURNS TABLE (
    agent_count BIGINT,
    task_count BIGINT,
    file_count BIGINT,
    storage_used_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::BIGINT FROM agents WHERE tenant_id = p_tenant_id AND status != 'terminated'),
        (SELECT COUNT(*)::BIGINT FROM tasks WHERE tenant_id = p_tenant_id),
        (SELECT COUNT(*)::BIGINT FROM files WHERE tenant_id = p_tenant_id),
        (SELECT COALESCE(SUM(size_bytes), 0) / (1024.0 * 1024.0) FROM files WHERE tenant_id = p_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if tenant can create more agents
CREATE OR REPLACE FUNCTION can_create_agent(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_agents BIGINT;
    v_agent_limit INTEGER;
    v_subscription_status VARCHAR(50);
BEGIN
    -- Get tenant subscription info
    SELECT 
        subscription_status,
        COALESCE(st.agent_limit, 3)
    INTO v_subscription_status, v_agent_limit
    FROM tenants t
    LEFT JOIN subscription_tiers st ON st.id = t.current_tier
    WHERE t.id = p_tenant_id;
    
    -- Get current agent count
    SELECT COUNT(*)::BIGINT INTO v_current_agents
    FROM agents
    WHERE tenant_id = p_tenant_id AND status != 'terminated';
    
    -- Unlimited agents for scale tier
    IF v_agent_limit IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    RETURN v_current_agents < v_agent_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start trial for new tenant
CREATE OR REPLACE FUNCTION start_trial(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE tenants
    SET 
        subscription_status = 'trialing',
        trial_ends_at = NOW() + INTERVAL '14 days',
        current_tier = 'starter',
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-start trial for new tenants
CREATE OR REPLACE FUNCTION auto_start_trial()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subscription_status := 'trialing';
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
    NEW.current_tier := 'starter';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only add trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'auto_start_trial_trigger' 
        AND tgrelid = 'tenants'::regclass
    ) THEN
        CREATE TRIGGER auto_start_trial_trigger
            BEFORE INSERT ON tenants
            FOR EACH ROW
            EXECUTE FUNCTION auto_start_trial();
    END IF;
END $$;

-- ============================================================================
-- RLS POLICIES FOR BILLING TABLES
-- ============================================================================

-- Billing events - tenants can only see their own
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_events_tenant_isolation ON billing_events
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Invoices - tenants can only see their own
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant_isolation ON invoices
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Subscription tiers are public (readable by all)
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_tiers_public_read ON subscription_tiers
    FOR SELECT
    USING (TRUE);

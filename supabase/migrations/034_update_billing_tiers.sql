-- Migration: 034_update_billing_tiers.sql
-- Description: Update subscription tiers to match new pricing model (Free, Pro $29, Enterprise)

-- ============================================================================
-- UPDATE SUBSCRIPTION TIER CONFIGURATION
-- ============================================================================

-- First, drop the old check constraint and add the new one
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_current_tier_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_current_tier_check 
    CHECK (current_tier IN ('free', 'starter', 'pro', 'business', 'scale', 'enterprise'));

-- Update existing tenants to use new tier names if needed
UPDATE tenants 
SET current_tier = 'free' 
WHERE current_tier = 'starter' AND subscription_status IN ('trialing', 'incomplete');

-- ============================================================================
-- UPDATE SUBSCRIPTION TIERS TABLE
-- ============================================================================

-- Delete old tiers
DELETE FROM subscription_tiers WHERE id IN ('starter', 'pro', 'business', 'scale');

-- Insert updated tiers
INSERT INTO subscription_tiers (
    id, 
    name, 
    description, 
    stripe_price_id, 
    stripe_price_id_live, 
    price_monthly, 
    agent_limit, 
    task_limit, 
    storage_limit_mb, 
    features, 
    is_active, 
    sort_order
)
VALUES 
    (
        'free', 
        'Free', 
        'Get started with 1 agent and basic features', 
        '', 
        '', 
        0, 
        1, 
        100, 
        100, 
        '["basic_agents", "email_support"]', 
        TRUE, 
        1
    ),
    (
        'pro', 
        'Pro', 
        '$29/month - Perfect for solopreneurs with multiple AI agents', 
        COALESCE((SELECT stripe_price_id FROM subscription_tiers WHERE id = 'pro'), 'price_pro_test'), 
        NULL, 
        2900, 
        5, 
        5000, 
        5000, 
        '["basic_agents", "advanced_agents", "email_support", "api_access", "analytics"]', 
        TRUE, 
        2
    ),
    (
        'business', 
        'Business', 
        '$99/month - For growing teams with advanced workflows', 
        COALESCE((SELECT stripe_price_id FROM subscription_tiers WHERE id = 'business'), 'price_business_test'), 
        NULL, 
        9900, 
        15, 
        25000, 
        25000, 
        '["basic_agents", "advanced_agents", "priority_support", "api_access", "custom_tools", "analytics", "webhooks"]', 
        TRUE, 
        3
    ),
    (
        'scale', 
        'Scale', 
        '$299/month - For larger teams scaling AI operations', 
        COALESCE((SELECT stripe_price_id FROM subscription_tiers WHERE id = 'scale'), 'price_scale_test'), 
        NULL, 
        29900, 
        50, 
        100000, 
        100000, 
        '["basic_agents", "advanced_agents", "priority_support", "api_access", "custom_tools", "analytics", "webhooks", "sso", "dedicated_support"]', 
        TRUE, 
        4
    ),
    (
        'enterprise', 
        'Enterprise', 
        'Custom pricing - Unlimited agents and enterprise features', 
        '', 
        '', 
        0, 
        NULL, 
        NULL, 
        NULL, 
        '["basic_agents", "advanced_agents", "priority_support", "api_access", "custom_tools", "analytics", "webhooks", "sso", "dedicated_support", "custom_contracts", "sla", "audit_logs"]', 
        TRUE, 
        5
    )
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
-- UPDATE SUBSCRIPTION STATUS CHECK CONSTRAINT
-- ============================================================================

-- Make sure the check constraint is up to date
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_subscription_status_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_subscription_status_check 
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'));

-- ============================================================================
-- ADD PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'card',
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    billing_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe ON payment_methods(stripe_payment_method_id);

-- Add trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES FOR PAYMENT METHODS
-- ============================================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_methods_tenant_isolation ON payment_methods
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- ADD BILLING HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'usd',
    stripe_invoice_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_history_tenant ON billing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created ON billing_history(created_at DESC);

-- ============================================================================
-- RLS POLICIES FOR BILLING HISTORY
-- ============================================================================

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_history_tenant_isolation ON billing_history
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- UPDATE FUNCTIONS
-- ============================================================================

-- Update can_create_agent function to handle new tiers
CREATE OR REPLACE FUNCTION can_create_agent(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_agents BIGINT;
    v_agent_limit INTEGER;
    v_subscription_status VARCHAR(50);
    v_current_tier VARCHAR(50);
BEGIN
    -- Get tenant subscription info
    SELECT 
        t.subscription_status,
        t.current_tier,
        COALESCE(st.agent_limit, 1)
    INTO v_subscription_status, v_current_tier, v_agent_limit
    FROM tenants t
    LEFT JOIN subscription_tiers st ON st.id = t.current_tier
    WHERE t.id = p_tenant_id;
    
    -- Get current agent count
    SELECT COUNT(*)::BIGINT INTO v_current_agents
    FROM agents
    WHERE tenant_id = p_tenant_id AND status != 'terminated';
    
    -- Unlimited agents for enterprise tier
    IF v_agent_limit IS NULL OR v_current_tier = 'enterprise' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    RETURN v_current_agents < v_agent_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE AUTO-TRIAL FUNCTION
-- ============================================================================

-- Update auto_start_trial to use 'free' tier instead of 'starter'
CREATE OR REPLACE FUNCTION auto_start_trial()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subscription_status := 'trialing';
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
    NEW.current_tier := 'free';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

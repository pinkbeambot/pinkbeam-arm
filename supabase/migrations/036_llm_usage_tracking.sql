-- Migration: 036_llm_usage_tracking
<<<<<<< HEAD
-- Description: Add tables for LLM usage tracking, cost management, and prompt versioning

-- ============================================================================
-- LLM USAGE LOG
-- ============================================================================
-- Detailed log of all LLM API calls for cost tracking and analytics
=======
-- Description: Add tables for LLM usage tracking and prompt versioning
>>>>>>> eng-ai/llm-improvements

CREATE TABLE llm_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
<<<<<<< HEAD
    
    -- Request identification
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_id TEXT, -- Correlation ID for retries/streaming
    
    -- Provider details
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'local')),
    model VARCHAR(100) NOT NULL,
    
    -- Token usage
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Cost tracking
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0, -- For prompt caching
    cache_discount_usd DECIMAL(10, 6) DEFAULT 0,
    
    -- Performance metrics
    latency_ms INTEGER,
    time_to_first_token_ms INTEGER, -- For streaming
    
    -- Request metadata
    request_type VARCHAR(50) DEFAULT 'completion', -- completion, embedding, etc.
    prompt_template_id TEXT, -- Reference to prompt version
    prompt_version INTEGER,
    ab_test_variant CHAR(1), -- A/B test variant (A or B)
    
    -- Response metadata
    finish_reason VARCHAR(50),
    was_streaming BOOLEAN DEFAULT FALSE,
    
    -- Error tracking
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    request_started_at TIMESTAMPTZ,
    request_completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_llm_usage_tenant ON llm_usage_log(tenant_id);
CREATE INDEX idx_llm_usage_agent ON llm_usage_log(agent_id);
CREATE INDEX idx_llm_usage_task ON llm_usage_log(task_id);
CREATE INDEX idx_llm_usage_created ON llm_usage_log(tenant_id, created_at DESC);
CREATE INDEX idx_llm_usage_provider ON llm_usage_log(tenant_id, provider);
CREATE INDEX idx_llm_usage_model ON llm_usage_log(tenant_id, model);
CREATE INDEX idx_llm_usage_date ON llm_usage_log(DATE(created_at));

-- RLS
ALTER TABLE llm_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY llm_usage_tenant_isolation ON llm_usage_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_llm_usage ON llm_usage_log
    FOR ALL
    TO service_role
    USING (true);

COMMENT ON TABLE llm_usage_log IS 'Detailed log of all LLM API calls for cost tracking and analytics';

-- ============================================================================
-- LLM USAGE AGGREGATES (Hourly)
-- ============================================================================
-- Pre-aggregated hourly usage for fast dashboard queries

CREATE TABLE llm_usage_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    hour TIMESTAMPTZ NOT NULL,
    
    -- Aggregated metrics
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd DECIMAL(12, 6) NOT NULL DEFAULT 0,
    avg_latency_ms INTEGER,
    
    -- Breakdown by provider
    provider_stats JSONB DEFAULT '{}'::jsonb,
    -- Format: {"anthropic": {"requests": 10, "tokens": 5000, "cost": 0.15}}
    
    -- Breakdown by model
    model_stats JSONB DEFAULT '{}'::jsonb,
    -- Format: {"claude-3-5-sonnet": {"requests": 10, "tokens": 5000}}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, hour)
);

CREATE INDEX idx_llm_usage_hourly_tenant ON llm_usage_hourly(tenant_id);
CREATE INDEX idx_llm_usage_hourly_time ON llm_usage_hourly(tenant_id, hour DESC);

ALTER TABLE llm_usage_hourly ENABLE ROW LEVEL SECURITY;

CREATE POLICY llm_usage_hourly_tenant_isolation ON llm_usage_hourly
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_llm_usage_hourly ON llm_usage_hourly
    FOR ALL
    TO service_role
    USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_llm_usage_hourly_updated_at BEFORE UPDATE ON llm_usage_hourly
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LLM USAGE LIMITS
-- ============================================================================
-- Configurable usage limits per tenant
=======
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'local')),
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    request_type VARCHAR(50) DEFAULT 'completion',
    prompt_template_id TEXT,
    finish_reason VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_tenant ON llm_usage_log(tenant_id);
CREATE INDEX idx_llm_usage_agent ON llm_usage_log(agent_id);
CREATE INDEX idx_llm_usage_created ON llm_usage_log(tenant_id, created_at DESC);

ALTER TABLE llm_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY llm_usage_tenant_isolation ON llm_usage_log FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY service_role_bypass_llm_usage ON llm_usage_log FOR ALL TO service_role USING (true);
>>>>>>> eng-ai/llm-improvements

CREATE TABLE llm_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
<<<<<<< HEAD
    
    -- Limit configuration
    limit_type VARCHAR(50) NOT NULL 
        CHECK (limit_type IN ('monthly_spend', 'daily_spend', 'monthly_tokens', 'daily_tokens', 'concurrent_requests')),
    limit_value DECIMAL(12, 4) NOT NULL,
    
    -- Period tracking
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    current_value DECIMAL(12, 4) NOT NULL DEFAULT 0,
    
    -- Alert configuration
    warning_threshold INTEGER NOT NULL DEFAULT 80, -- Percentage (0-100)
    hard_limit BOOLEAN NOT NULL DEFAULT FALSE,
    alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_alert_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
=======
    limit_type VARCHAR(50) NOT NULL CHECK (limit_type IN ('monthly_spend', 'daily_spend', 'monthly_tokens', 'daily_tokens')),
    limit_value DECIMAL(12, 4) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    current_value DECIMAL(12, 4) NOT NULL DEFAULT 0,
    warning_threshold INTEGER NOT NULL DEFAULT 80,
    hard_limit BOOLEAN NOT NULL DEFAULT FALSE,
    alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
>>>>>>> eng-ai/llm-improvements
    UNIQUE(tenant_id, limit_type, period_start)
);

CREATE INDEX idx_llm_usage_limits_tenant ON llm_usage_limits(tenant_id);
<<<<<<< HEAD
CREATE INDEX idx_llm_usage_limits_type ON llm_usage_limits(tenant_id, limit_type);

ALTER TABLE llm_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY llm_usage_limits_tenant_isolation ON llm_usage_limits
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_llm_usage_limits ON llm_usage_limits
    FOR ALL
    TO service_role
    USING (true);

CREATE TRIGGER update_llm_usage_limits_updated_at BEFORE UPDATE ON llm_usage_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROMPT VERSIONS
-- ============================================================================
-- Version control for prompt templates

CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL, -- User-facing ID (e.g., "agent-spawn-system")
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system prompts
    
    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL 
        CHECK (category IN ('system', 'task-generation', 'decision-making', 'escalation', 'summarization', 'code-generation', 'analysis', 'creative', 'custom')),
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Content
    system_prompt TEXT,
    user_prompt_template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [{"name": "agentName", "type": "string", "required": true, "defaultValue": null}]
    
    -- Metadata
    estimated_tokens INTEGER,
    tags TEXT[],
    
    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5, 4), -- 0-1
    avg_latency_ms INTEGER,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
=======
ALTER TABLE llm_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY llm_usage_limits_tenant_isolation ON llm_usage_limits FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('system', 'task-generation', 'decision-making', 'escalation', 'summarization', 'code-generation', 'analysis', 'creative', 'custom')),
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    system_prompt TEXT,
    user_prompt_template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_tokens INTEGER,
    tags TEXT[],
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
>>>>>>> eng-ai/llm-improvements
    UNIQUE(template_id, tenant_id, version)
);

CREATE INDEX idx_prompt_templates_tenant ON prompt_templates(tenant_id);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(tenant_id, category);
<<<<<<< HEAD
CREATE INDEX idx_prompt_templates_active ON prompt_templates(tenant_id, template_id, is_active);

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY prompt_templates_tenant_isolation ON prompt_templates
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID OR is_public = TRUE);

CREATE POLICY service_role_bypass_prompt_templates ON prompt_templates
    FOR ALL
    TO service_role
    USING (true);

CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- A/B TESTS
-- ============================================================================
-- A/B testing for prompt variations

CREATE TABLE prompt_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Test configuration
    name VARCHAR(255) NOT NULL,
    template_id TEXT NOT NULL,
    variant_a_id UUID NOT NULL REFERENCES prompt_templates(id),
    variant_b_id UUID NOT NULL REFERENCES prompt_templates(id),
    
    -- Traffic split (0-1, percentage for variant A)
    traffic_split DECIMAL(3, 2) NOT NULL DEFAULT 0.5,
    
    -- Success criteria
    primary_metric VARCHAR(50) NOT NULL DEFAULT 'success_rate',
    sample_size_target INTEGER NOT NULL DEFAULT 100,
    min_confidence_level DECIMAL(3, 2) NOT NULL DEFAULT 0.95,
    auto_promote_winner BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    
    -- Results
    winner_id UUID REFERENCES prompt_templates(id),
    confidence DECIMAL(3, 2),
    is_significant BOOLEAN,
    results JSONB,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_prompt_ab_tests_tenant ON prompt_ab_tests(tenant_id);
CREATE INDEX idx_prompt_ab_tests_status ON prompt_ab_tests(tenant_id, status);
CREATE INDEX idx_prompt_ab_tests_template ON prompt_ab_tests(template_id);

ALTER TABLE prompt_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY prompt_ab_tests_tenant_isolation ON prompt_ab_tests
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_prompt_ab_tests ON prompt_ab_tests
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to record LLM usage
CREATE OR REPLACE FUNCTION record_llm_usage(
    p_tenant_id UUID,
    p_agent_id UUID,
    p_task_id UUID,
    p_user_id UUID,
    p_provider TEXT,
    p_model TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_cost_usd DECIMAL,
    p_latency_ms INTEGER,
    p_request_type TEXT DEFAULT 'completion',
    p_finish_reason TEXT DEFAULT NULL,
    p_was_streaming BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_usage_id UUID;
    v_hour TIMESTAMPTZ;
BEGIN
    -- Insert into detailed log
    INSERT INTO llm_usage_log (
        tenant_id, agent_id, task_id, user_id,
        provider, model, input_tokens, output_tokens, total_tokens,
        cost_usd, latency_ms, request_type, finish_reason, was_streaming
    ) VALUES (
        p_tenant_id, p_agent_id, p_task_id, p_user_id,
        p_provider, p_model, p_input_tokens, p_output_tokens, 
        p_input_tokens + p_output_tokens,
        p_cost_usd, p_latency_ms, p_request_type, p_finish_reason, p_was_streaming
    ) RETURNING id INTO v_usage_id;
    
    -- Update hourly aggregates
    v_hour := DATE_TRUNC('hour', NOW());
    
    INSERT INTO llm_usage_hourly (
        tenant_id, hour, total_requests, total_input_tokens, 
        total_output_tokens, total_tokens, total_cost_usd,
        provider_stats, model_stats
    ) VALUES (
        p_tenant_id, v_hour, 1, p_input_tokens,
        p_output_tokens, p_input_tokens + p_output_tokens, p_cost_usd,
        jsonb_build_object(p_provider, jsonb_build_object(
            'requests', 1, 
            'tokens', p_input_tokens + p_output_tokens,
            'cost', p_cost_usd
        )),
        jsonb_build_object(p_model, jsonb_build_object(
            'requests', 1,
            'tokens', p_input_tokens + p_output_tokens
        ))
    )
    ON CONFLICT (tenant_id, hour)
    DO UPDATE SET
        total_requests = llm_usage_hourly.total_requests + 1,
        total_input_tokens = llm_usage_hourly.total_input_tokens + p_input_tokens,
        total_output_tokens = llm_usage_hourly.total_output_tokens + p_output_tokens,
        total_tokens = llm_usage_hourly.total_tokens + p_input_tokens + p_output_tokens,
        total_cost_usd = llm_usage_hourly.total_cost_usd + p_cost_usd,
        provider_stats = jsonb_set(
            llm_usage_hourly.provider_stats,
            ARRAY[p_provider],
            COALESCE(
                llm_usage_hourly.provider_stats->p_provider,
                '{}'::jsonb
            ) || jsonb_build_object(
                'requests', COALESCE((llm_usage_hourly.provider_stats->p_provider->>'requests')::int, 0) + 1,
                'tokens', COALESCE((llm_usage_hourly.provider_stats->p_provider->>'tokens')::int, 0) + p_input_tokens + p_output_tokens,
                'cost', COALESCE((llm_usage_hourly.provider_stats->p_provider->>'cost')::decimal, 0) + p_cost_usd
            ),
            true
        ),
        model_stats = jsonb_set(
            llm_usage_hourly.model_stats,
            ARRAY[p_model],
            COALESCE(
                llm_usage_hourly.model_stats->p_model,
                '{}'::jsonb
            ) || jsonb_build_object(
                'requests', COALESCE((llm_usage_hourly.model_stats->p_model->>'requests')::int, 0) + 1,
                'tokens', COALESCE((llm_usage_hourly.model_stats->p_model->>'tokens')::int, 0) + p_input_tokens + p_output_tokens
            ),
            true
        ),
        updated_at = NOW();
    
    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get usage summary for a tenant
CREATE OR REPLACE FUNCTION get_llm_usage_summary(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_requests BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL,
    avg_latency_ms BIGINT,
    top_models JSONB,
    daily_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as requests,
            SUM(total_tokens) as tokens,
            SUM(cost_usd) as cost,
            AVG(latency_ms)::bigint as avg_latency
        FROM llm_usage_log
        WHERE tenant_id = p_tenant_id
        AND DATE(created_at) BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(created_at)
    ),
    model_stats AS (
        SELECT 
            model,
            COUNT(*) as requests,
            SUM(total_tokens) as tokens,
            SUM(cost_usd) as cost
        FROM llm_usage_log
        WHERE tenant_id = p_tenant_id
        AND DATE(created_at) BETWEEN p_start_date AND p_end_date
        GROUP BY model
        ORDER BY SUM(cost_usd) DESC
        LIMIT 5
    )
    SELECT 
        COALESCE(SUM(ds.requests), 0)::bigint as total_requests,
        COALESCE(SUM(ds.tokens), 0)::bigint as total_tokens,
        COALESCE(SUM(ds.cost), 0)::decimal as total_cost_usd,
        COALESCE(AVG(ds.avg_latency), 0)::bigint as avg_latency_ms,
        (SELECT jsonb_agg(jsonb_build_object(
            'model', model,
            'requests', requests,
            'tokens', tokens,
            'cost', cost
        )) FROM model_stats) as top_models,
        (SELECT jsonb_agg(jsonb_build_object(
            'date', date,
            'requests', requests,
            'tokens', tokens,
            'cost', cost
        ) ORDER BY date) FROM daily_stats) as daily_breakdown
    FROM daily_stats ds;
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limits(
    p_tenant_id UUID,
    p_cost_usd DECIMAL DEFAULT 0,
    p_tokens INTEGER DEFAULT 0
)
RETURNS TABLE (
    limit_id UUID,
    limit_type TEXT,
    limit_value DECIMAL,
    current_value DECIMAL,
    usage_percent DECIMAL,
    is_exceeded BOOLEAN,
    is_warning BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ul.id as limit_id,
        ul.limit_type::text,
        ul.limit_value,
        ul.current_value + CASE 
            WHEN ul.limit_type LIKE '%spend%' THEN p_cost_usd 
            ELSE p_tokens 
        END as current_value,
        ROUND(((ul.current_value + CASE 
            WHEN ul.limit_type LIKE '%spend%' THEN p_cost_usd 
            ELSE p_tokens 
        END) / ul.limit_value) * 100, 2) as usage_percent,
        (ul.current_value + CASE 
            WHEN ul.limit_type LIKE '%spend%' THEN p_cost_usd 
            ELSE p_tokens 
        END) >= ul.limit_value AND ul.hard_limit as is_exceeded,
        ((ul.current_value + CASE 
            WHEN ul.limit_type LIKE '%spend%' THEN p_cost_usd 
            ELSE p_tokens 
        END) / ul.limit_value) * 100 >= ul.warning_threshold as is_warning
    FROM llm_usage_limits ul
    WHERE ul.tenant_id = p_tenant_id
    AND NOW() BETWEEN ul.period_start AND ul.period_end;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD TO REALTIME
-- ============================================================================
=======
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY prompt_templates_tenant_isolation ON prompt_templates FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID OR is_public = TRUE);
>>>>>>> eng-ai/llm-improvements

ALTER PUBLICATION supabase_realtime ADD TABLE llm_usage_log;
ALTER PUBLICATION supabase_realtime ADD TABLE llm_usage_limits;
ALTER PUBLICATION supabase_realtime ADD TABLE prompt_templates;
<<<<<<< HEAD
ALTER PUBLICATION supabase_realtime ADD TABLE prompt_ab_tests;
=======
>>>>>>> eng-ai/llm-improvements

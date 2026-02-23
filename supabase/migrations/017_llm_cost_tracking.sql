-- Migration 017: LLM Cost Tracking Table
-- Issue #117: LLM cost tracking persistence
-- 
-- This migration creates a dedicated table for tracking LLM API costs
-- with support for billing, analytics, and cost management.

-- ============================================================================
-- Create llm_costs table
-- ============================================================================

CREATE TABLE llm_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Request details
    model VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'anthropic', 'openai', etc.
    
    -- Token usage
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Cost calculations
    input_cost_usd DECIMAL(12, 8) NOT NULL DEFAULT 0,
    output_cost_usd DECIMAL(12, 8) NOT NULL DEFAULT 0,
    total_cost_usd DECIMAL(12, 8) NOT NULL DEFAULT 0,
    
    -- Request metadata
    request_type VARCHAR(50) DEFAULT 'task_execution', -- 'task_execution', 'decision', 'chat', etc.
    status VARCHAR(20) DEFAULT 'success', -- 'success', 'error', 'cached'
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT llm_costs_tokens_non_negative CHECK (input_tokens >= 0 AND output_tokens >= 0),
    CONSTRAINT llm_costs_cost_non_negative CHECK (input_cost_usd >= 0 AND output_cost_usd >= 0)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Primary query patterns
CREATE INDEX idx_llm_costs_tenant_id ON llm_costs(tenant_id);
CREATE INDEX idx_llm_costs_agent_id ON llm_costs(agent_id);
CREATE INDEX idx_llm_costs_task_id ON llm_costs(task_id);

-- Time-based queries for billing and analytics
CREATE INDEX idx_llm_costs_created_at ON llm_costs(created_at);
CREATE INDEX idx_llm_costs_tenant_created_at ON llm_costs(tenant_id, created_at);

-- Model and provider analytics
CREATE INDEX idx_llm_costs_model ON llm_costs(model);
CREATE INDEX idx_llm_costs_provider ON llm_costs(provider);

-- Status tracking
CREATE INDEX idx_llm_costs_status ON llm_costs(status);

-- Composite index for common dashboard queries
CREATE INDEX idx_llm_costs_tenant_agent_created ON llm_costs(tenant_id, agent_id, created_at);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE llm_costs ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own cost data
CREATE POLICY tenant_isolation_llm_costs ON llm_costs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- Helper functions for cost tracking
-- ============================================================================

-- Function to record LLM cost
CREATE OR REPLACE FUNCTION record_llm_cost(
    p_tenant_id UUID,
    p_agent_id UUID,
    p_task_id UUID,
    p_model VARCHAR,
    p_provider VARCHAR,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_input_cost_usd DECIMAL,
    p_output_cost_usd DECIMAL,
    p_request_type VARCHAR DEFAULT 'task_execution',
    p_status VARCHAR DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_id UUID;
    v_total_tokens INTEGER;
    v_total_cost DECIMAL;
BEGIN
    -- Calculate totals
    v_total_tokens := p_input_tokens + p_output_tokens;
    v_total_cost := p_input_cost_usd + p_output_cost_usd;
    
    -- Insert cost record
    INSERT INTO llm_costs (
        tenant_id,
        agent_id,
        task_id,
        model,
        provider,
        input_tokens,
        output_tokens,
        total_tokens,
        input_cost_usd,
        output_cost_usd,
        total_cost_usd,
        request_type,
        status,
        error_message
    ) VALUES (
        p_tenant_id,
        p_agent_id,
        p_task_id,
        p_model,
        p_provider,
        p_input_tokens,
        p_output_tokens,
        v_total_tokens,
        p_input_cost_usd,
        p_output_cost_usd,
        v_total_cost,
        p_request_type,
        p_status,
        p_error_message
    )
    RETURNING id INTO v_cost_id;
    
    RETURN v_cost_id;
END;
$$;

-- Function to get cost summary for a tenant
CREATE OR REPLACE FUNCTION get_tenant_cost_summary(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_requests BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL,
    avg_cost_per_request DECIMAL,
    avg_tokens_per_request DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_requests,
        COALESCE(SUM(total_tokens), 0)::BIGINT as total_tokens,
        COALESCE(SUM(total_cost_usd), 0)::DECIMAL as total_cost_usd,
        COALESCE(AVG(total_cost_usd), 0)::DECIMAL as avg_cost_per_request,
        COALESCE(AVG(total_tokens), 0)::DECIMAL as avg_tokens_per_request
    FROM llm_costs
    WHERE tenant_id = p_tenant_id
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;

-- Function to get cost breakdown by model
CREATE OR REPLACE FUNCTION get_tenant_cost_by_model(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    model VARCHAR,
    provider VARCHAR,
    request_count BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.model,
        c.provider,
        COUNT(*)::BIGINT as request_count,
        COALESCE(SUM(c.total_tokens), 0)::BIGINT as total_tokens,
        COALESCE(SUM(c.total_cost_usd), 0)::DECIMAL as total_cost_usd
    FROM llm_costs c
    WHERE c.tenant_id = p_tenant_id
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
    GROUP BY c.model, c.provider
    ORDER BY total_cost_usd DESC;
END;
$$;

-- Function to get daily cost aggregation for a tenant
CREATE OR REPLACE FUNCTION get_tenant_daily_costs(
    p_tenant_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    request_count BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(c.created_at) as date,
        COUNT(*)::BIGINT as request_count,
        COALESCE(SUM(c.total_tokens), 0)::BIGINT as total_tokens,
        COALESCE(SUM(c.total_cost_usd), 0)::DECIMAL as total_cost_usd
    FROM llm_costs c
    WHERE c.tenant_id = p_tenant_id
        AND c.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY DATE(c.created_at)
    ORDER BY date DESC;
END;
$$;

-- Function to get agent cost summary
CREATE OR REPLACE FUNCTION get_agent_cost_summary(
    p_agent_id UUID
)
RETURNS TABLE (
    total_requests BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL,
    last_request_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_requests,
        COALESCE(SUM(total_tokens), 0)::BIGINT as total_tokens,
        COALESCE(SUM(total_cost_usd), 0)::DECIMAL as total_cost_usd,
        MAX(created_at) as last_request_at
    FROM llm_costs
    WHERE agent_id = p_agent_id;
END;
$$;

-- ============================================================================
-- Realtime support
-- ============================================================================

-- Add to realtime publication for live cost tracking
ALTER PUBLICATION supabase_realtime ADD TABLE llm_costs;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE llm_costs IS 'Tracks LLM API usage costs for billing and analytics';
COMMENT ON COLUMN llm_costs.tenant_id IS 'Tenant that incurred the cost';
COMMENT ON COLUMN llm_costs.agent_id IS 'Agent that made the LLM request';
COMMENT ON COLUMN llm_costs.task_id IS 'Optional task associated with the request';
COMMENT ON COLUMN llm_costs.model IS 'LLM model used (e.g., claude-3-5-sonnet, gpt-4-turbo)';
COMMENT ON COLUMN llm_costs.provider IS 'API provider (anthropic, openai)';
COMMENT ON COLUMN llm_costs.input_tokens IS 'Number of input/prompt tokens';
COMMENT ON COLUMN llm_costs.output_tokens IS 'Number of output/completion tokens';
COMMENT ON COLUMN llm_costs.total_cost_usd IS 'Total cost in USD (input + output)';
COMMENT ON COLUMN llm_costs.request_type IS 'Type of request: task_execution, decision, chat';
COMMENT ON FUNCTION record_llm_cost IS 'Records a new LLM API cost entry';

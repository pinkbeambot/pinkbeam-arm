-- Migration: 036_llm_usage_tracking
-- Description: Add tables for LLM usage tracking and prompt versioning

CREATE TABLE llm_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

CREATE TABLE llm_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    limit_type VARCHAR(50) NOT NULL CHECK (limit_type IN ('monthly_spend', 'daily_spend', 'monthly_tokens', 'daily_tokens')),
    limit_value DECIMAL(12, 4) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    current_value DECIMAL(12, 4) NOT NULL DEFAULT 0,
    warning_threshold INTEGER NOT NULL DEFAULT 80,
    hard_limit BOOLEAN NOT NULL DEFAULT FALSE,
    alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, limit_type, period_start)
);

CREATE INDEX idx_llm_usage_limits_tenant ON llm_usage_limits(tenant_id);
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
    UNIQUE(template_id, tenant_id, version)
);

CREATE INDEX idx_prompt_templates_tenant ON prompt_templates(tenant_id);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(tenant_id, category);
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY prompt_templates_tenant_isolation ON prompt_templates FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID OR is_public = TRUE);

ALTER PUBLICATION supabase_realtime ADD TABLE llm_usage_log;
ALTER PUBLICATION supabase_realtime ADD TABLE llm_usage_limits;
ALTER PUBLICATION supabase_realtime ADD TABLE prompt_templates;

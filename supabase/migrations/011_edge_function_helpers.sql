-- Migration: 011_edge_function_helpers
-- Description: Helper functions for edge functions and webhook support

-- ============================================================================
-- WEBHOOK EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event details
    source VARCHAR(50) NOT NULL, -- 'github', 'stripe', 'slack', 'custom'
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Processing
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    
    -- Retry tracking
    attempt_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX idx_webhook_events_source ON webhook_events(tenant_id, source);
CREATE INDEX idx_webhook_events_created ON webhook_events(tenant_id, created_at DESC);

-- RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_tenant_isolation ON webhook_events
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_webhook_events ON webhook_events
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- TENANT WEBHOOK CONFIGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    webhook_type VARCHAR(50) NOT NULL, -- 'github', 'stripe', 'slack', 'custom'
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Security
    is_active BOOLEAN DEFAULT true,
    secret_encrypted TEXT, -- Encrypted webhook secret
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, webhook_type)
);

CREATE INDEX idx_tenant_webhook_configs_tenant ON tenant_webhook_configs(tenant_id);

-- RLS
ALTER TABLE tenant_webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_webhook_configs_isolation ON tenant_webhook_configs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_tenant_webhook_configs ON tenant_webhook_configs
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- AGENT TASK STATS UPDATE FUNCTIONS
-- ============================================================================

-- Function to increment agent escalation count
CREATE OR REPLACE FUNCTION increment_agent_escalation_count(p_agent_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE agents
    SET 
        stats = jsonb_set(
            stats,
            '{escalations_raised}',
            (COALESCE(stats->>'escalations_raised', '0')::int + 1)::text::jsonb
        ),
        updated_at = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment agent failed task count
CREATE OR REPLACE FUNCTION increment_agent_failed_task(p_agent_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE agents
    SET 
        stats = jsonb_set(
            stats,
            '{tasks_failed}',
            (COALESCE(stats->>'tasks_failed', '0')::int + 1)::text::jsonb
        ),
        updated_at = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update agent task stats on completion
CREATE OR REPLACE FUNCTION update_agent_task_stats(
    p_agent_id UUID,
    p_task_duration_seconds INTEGER,
    p_tokens_used INTEGER,
    p_cost_usd NUMERIC
)
RETURNS void AS $$
DECLARE
    v_current_completed INTEGER;
    v_current_total_duration NUMERIC;
    v_new_avg_duration NUMERIC;
BEGIN
    -- Get current stats
    SELECT 
        COALESCE(stats->>'tasks_completed', '0')::int,
        COALESCE(stats->>'avg_task_duration_seconds', '0')::numeric * COALESCE(stats->>'tasks_completed', '0')::int
    INTO v_current_completed, v_current_total_duration
    FROM agents
    WHERE id = p_agent_id;

    -- Calculate new average duration
    v_new_avg_duration := (v_current_total_duration + p_task_duration_seconds) / (v_current_completed + 1);

    -- Update stats
    UPDATE agents
    SET 
        stats = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        stats,
                        '{tasks_completed}',
                        (v_current_completed + 1)::text::jsonb
                    ),
                    '{avg_task_duration_seconds}',
                    v_new_avg_duration::text::jsonb
                ),
                '{total_cost_usd}',
                (COALESCE(stats->>'total_cost_usd', '0')::numeric + p_cost_usd)::text::jsonb
            ),
            '{total_tokens_used}',
            (COALESCE(stats->>'total_tokens_used', '0')::int + p_tokens_used)::text::jsonb
        ),
        updated_at = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AGENT SESSION MANAGEMENT
-- ============================================================================

-- Function to create or update agent session
CREATE OR REPLACE FUNCTION upsert_agent_session(
    p_agent_id UUID,
    p_tenant_id UUID,
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Try to update existing session
    UPDATE agent_sessions
    SET 
        context = context || p_context,
        updated_at = NOW()
    WHERE agent_id = p_agent_id
    AND tenant_id = p_tenant_id
    RETURNING id INTO v_session_id;

    -- If no existing session, create one
    IF v_session_id IS NULL THEN
        v_session_id := uuid_generate_v4();
        
        INSERT INTO agent_sessions (
            id,
            tenant_id,
            agent_id,
            context,
            started_at,
            environment
        ) VALUES (
            v_session_id,
            p_tenant_id,
            p_agent_id,
            p_context,
            NOW(),
            'edge-function'
        );
    END IF;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end agent session
CREATE OR REPLACE FUNCTION end_agent_session(
    p_agent_id UUID,
    p_tenant_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE agent_sessions
    SET ended_at = NOW()
    WHERE agent_id = p_agent_id
    AND tenant_id = p_tenant_id
    AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MESSAGE DELIVERY FUNCTIONS
-- ============================================================================

-- Function to mark message as delivered
CREATE OR REPLACE FUNCTION mark_message_delivered(p_message_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE message_delivery
    SET 
        status = 'delivered',
        last_attempt_at = NOW(),
        attempt_count = attempt_count + 1,
        updated_at = NOW()
    WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as failed
CREATE OR REPLACE FUNCTION mark_message_failed(
    p_message_id UUID,
    p_error_message TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE message_delivery
    SET 
        status = 'failed',
        last_attempt_at = NOW(),
        attempt_count = attempt_count + 1,
        error_message = p_error_message,
        updated_at = NOW()
    WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to acknowledge message
CREATE OR REPLACE FUNCTION acknowledge_message(
    p_message_id UUID,
    p_agent_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE message_delivery
    SET 
        status = 'delivered',
        acked_at = NOW(),
        acked_by_agent_id = p_agent_id,
        updated_at = NOW()
    WHERE message_id = p_message_id;
    
    UPDATE messages
    SET acked_at = NOW()
    WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TASK QUEUE MANAGEMENT
-- ============================================================================

-- Function to add task to queue
CREATE OR REPLACE FUNCTION enqueue_task(
    p_task_id UUID,
    p_tenant_id UUID,
    p_priority INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
    INSERT INTO agent_task_queue (
        tenant_id,
        task_id,
        status,
        priority
    ) VALUES (
        p_tenant_id,
        p_task_id,
        'pending',
        p_priority
    )
    ON CONFLICT (task_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to release claimed task back to queue
CREATE OR REPLACE FUNCTION release_task(
    p_task_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE agent_task_queue
    SET 
        status = 'pending',
        agent_id = NULL,
        claimed_at = NULL,
        last_error = p_reason,
        attempt_count = attempt_count + 1,
        updated_at = NOW()
    WHERE task_id = p_task_id
    AND status IN ('claimed', 'processing');
    
    -- Also update task status
    UPDATE tasks
    SET 
        status = 'queued',
        assignee_id = NULL,
        updated_at = NOW()
    WHERE id = p_task_id
    AND status IN ('in_progress', 'blocked');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VALIDATION FUNCTIONS
-- ============================================================================

-- Function to check if agent can spawn children
CREATE OR REPLACE FUNCTION can_agent_spawn_children(p_agent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_spawn BOOLEAN;
    v_current_children INTEGER;
    v_max_children INTEGER;
BEGIN
    -- Check capability
    SELECT 'spawn' = ANY(capabilities)
    INTO v_can_spawn
    FROM agents
    WHERE id = p_agent_id;
    
    IF NOT v_can_spawn THEN
        RETURN false;
    END IF;
    
    -- Check limit
    SELECT 
        COALESCE((limits->>'max_sub_agents')::int, 5),
        (SELECT COUNT(*)::int FROM agents WHERE parent_id = p_agent_id AND status != 'terminated')
    INTO v_max_children, v_current_children;
    
    RETURN v_current_children < v_max_children;
END;
$$ LANGUAGE plpgsql;

-- Function to check tenant limits
CREATE OR REPLACE FUNCTION check_tenant_agent_limit(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_agents INTEGER;
    v_current_agents INTEGER;
BEGIN
    SELECT (limits->>'max_agents')::int
    INTO v_max_agents
    FROM tenants
    WHERE id = p_tenant_id;
    
    SELECT COUNT(*)::int
    INTO v_current_agents
    FROM agents
    WHERE tenant_id = p_tenant_id
    AND status != 'terminated';
    
    RETURN v_current_agents < COALESCE(v_max_agents, 10);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_tenant_webhook_configs_updated_at
    BEFORE UPDATE ON tenant_webhook_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME SUPPORT
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE webhook_events;

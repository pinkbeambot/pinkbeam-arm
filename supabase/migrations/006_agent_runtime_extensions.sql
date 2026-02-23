-- Migration: 006_agent_runtime_extensions
-- Description: Extensions for agent runtime support

-- ============================================================================
-- AGENT RUNTIME QUEUE (for task distribution)
-- ============================================================================

CREATE TABLE agent_task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Task reference
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Queue state
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'claimed', 'processing', 'completed', 'failed')),
    
    -- Execution
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Retry logic
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    
    -- Priority (lower = higher priority)
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_task_queue_tenant ON agent_task_queue(tenant_id);
CREATE INDEX idx_agent_task_queue_status ON agent_task_queue(tenant_id, status);
CREATE INDEX idx_agent_task_queue_agent ON agent_task_queue(agent_id);
CREATE INDEX idx_agent_task_queue_priority ON agent_task_queue(tenant_id, priority DESC, created_at ASC);

-- RLS
ALTER TABLE agent_task_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_task_queue_tenant_isolation ON agent_task_queue
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_agent_task_queue ON agent_task_queue
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- AGENT DECISION LOG (for audit trail)
-- ============================================================================

CREATE TABLE agent_decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Who made the decision
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    session_id UUID,
    
    -- Context
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
    
    -- Decision details
    category VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_params JSONB DEFAULT '{}'::jsonb,
    
    -- Reasoning capture
    reasoning TEXT,
    confidence DECIMAL(3,2),
    
    -- Outcome
    outcome JSONB,
    success BOOLEAN,
    
    -- Performance
    latency_ms INTEGER,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,4),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_decision_log_tenant ON agent_decision_log(tenant_id);
CREATE INDEX idx_agent_decision_log_agent ON agent_decision_log(agent_id);
CREATE INDEX idx_agent_decision_log_task ON agent_decision_log(task_id);
CREATE INDEX idx_agent_decision_log_created ON agent_decision_log(tenant_id, created_at DESC);

-- RLS
ALTER TABLE agent_decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_decision_log_tenant_isolation ON agent_decision_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_agent_decision_log ON agent_decision_log
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- AGENT EXECUTION HISTORY
-- ============================================================================

CREATE TABLE agent_execution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    session_id UUID,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Execution details
    execution_type VARCHAR(50) NOT NULL, -- 'task', 'decision', 'message', 'spawn'
    execution_id UUID NOT NULL, -- Reference to the specific execution
    
    -- Input/Output
    input_payload JSONB,
    output_payload JSONB,
    
    -- Result
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'timeout', 'error')),
    error_message TEXT,
    
    -- Performance
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Resources
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_exec_history_tenant ON agent_execution_history(tenant_id);
CREATE INDEX idx_agent_exec_history_agent ON agent_execution_history(agent_id);
CREATE INDEX idx_agent_exec_history_task ON agent_execution_history(task_id);
CREATE INDEX idx_agent_exec_history_created ON agent_execution_history(tenant_id, created_at DESC);

-- RLS
ALTER TABLE agent_execution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_exec_history_tenant_isolation ON agent_execution_history
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_agent_exec_history ON agent_execution_history
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- MESSAGE DELIVERY TRACKING
-- ============================================================================

CREATE TABLE message_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Delivery state
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'delivered', 'failed', 'expired')),
    
    -- Delivery attempts
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Acknowledgment
    acked_at TIMESTAMPTZ,
    acked_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- TTL tracking
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_delivery_tenant ON message_delivery(tenant_id);
CREATE INDEX idx_message_delivery_message ON message_delivery(message_id);
CREATE INDEX idx_message_delivery_status ON message_delivery(tenant_id, status);

-- RLS
ALTER TABLE message_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_delivery_tenant_isolation ON message_delivery
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_message_delivery ON message_delivery
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- AGENT LIFECYCLE EVENTS
-- ============================================================================

CREATE TABLE agent_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL 
        CHECK (event_type IN ('created', 'initialized', 'activated', 'paused', 'resumed', 'error', 'terminated', 'spawned_child')),
    previous_state VARCHAR(50),
    new_state VARCHAR(50),
    
    -- Context
    triggered_by UUID, -- Agent or user that triggered the change
    triggered_by_type VARCHAR(20) CHECK (triggered_by_type IN ('agent', 'user', 'system')),
    reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_lifecycle_tenant ON agent_lifecycle_events(tenant_id);
CREATE INDEX idx_agent_lifecycle_agent ON agent_lifecycle_events(agent_id);
CREATE INDEX idx_agent_lifecycle_event ON agent_lifecycle_events(tenant_id, event_type);
CREATE INDEX idx_agent_lifecycle_created ON agent_lifecycle_events(tenant_id, created_at DESC);

-- RLS
ALTER TABLE agent_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_lifecycle_tenant_isolation ON agent_lifecycle_events
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY service_role_bypass_agent_lifecycle ON agent_lifecycle_events
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_agent_task_queue_updated_at BEFORE UPDATE ON agent_task_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_delivery_updated_at BEFORE UPDATE ON message_delivery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LIFECYCLE LOGGING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION log_agent_lifecycle_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO agent_lifecycle_events (
            tenant_id, agent_id, event_type, new_state, triggered_by_type, reason
        ) VALUES (
            NEW.tenant_id, NEW.id, 'created', NEW.status, 'system', 'Agent created'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO agent_lifecycle_events (
            tenant_id, agent_id, event_type, previous_state, new_state, reason
        ) VALUES (
            NEW.tenant_id, NEW.id, 
            CASE NEW.status
                WHEN 'idle' THEN 'activated'
                WHEN 'paused' THEN 'paused'
                WHEN 'error' THEN 'error'
                WHEN 'terminated' THEN 'terminated'
                ELSE 'resumed'
            END,
            OLD.status, NEW.status, NEW.status_reason
        );
        RETURN NEW;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_lifecycle_trigger
    AFTER INSERT OR UPDATE OF status ON agents
    FOR EACH ROW EXECUTE FUNCTION log_agent_lifecycle_event();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to claim next task from queue
CREATE OR REPLACE FUNCTION claim_next_task(p_agent_id UUID, p_tenant_id UUID)
RETURNS TABLE(task_id UUID, queue_id UUID) AS $$
BEGIN
    RETURN QUERY
    UPDATE agent_task_queue q
    SET status = 'claimed',
        agent_id = p_agent_id,
        claimed_at = NOW()
    FROM tasks t
    WHERE q.id = (
        SELECT q2.id 
        FROM agent_task_queue q2
        JOIN tasks t2 ON q2.task_id = t2.id
        WHERE q2.tenant_id = p_tenant_id 
        AND q2.status = 'pending'
        AND t2.status = 'queued'
        ORDER BY q2.priority DESC, q2.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    AND q.task_id = t.id
    RETURNING q.task_id, q.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent capability check
CREATE OR REPLACE FUNCTION agent_has_capability(p_agent_id UUID, p_capability TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_capability BOOLEAN;
BEGIN
    SELECT p_capability = ANY(capabilities)
    INTO v_has_capability
    FROM agents
    WHERE id = p_agent_id;
    
    RETURN COALESCE(v_has_capability, false);
END;
$$ LANGUAGE plpgsql;

-- Add tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE agent_task_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE message_delivery;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_lifecycle_events;

-- Migration: 015_meta_agent_tables
-- Description: VALIS Meta-Agent Natural Language Interface tables
-- Issue: #17

-- ============================================================================
-- META AGENT SESSIONS
-- ============================================================================
-- Tracks conversational sessions between the CEO and VALIS

CREATE TABLE meta_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session metadata
    title VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    
    -- Context tracking
    context JSONB DEFAULT '{}'::jsonb,
    -- Stores: current_topic, referenced_agents, pending_actions, etc.
    
    -- Session metrics
    message_count INTEGER DEFAULT 0,
    command_count INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_agent_sessions_tenant ON meta_agent_sessions(tenant_id);
CREATE INDEX idx_meta_agent_sessions_user ON meta_agent_sessions(user_id);
CREATE INDEX idx_meta_agent_sessions_status ON meta_agent_sessions(tenant_id, status);
CREATE INDEX idx_meta_agent_sessions_activity ON meta_agent_sessions(tenant_id, last_activity_at DESC);

COMMENT ON TABLE meta_agent_sessions IS 'Conversational sessions between CEO and VALIS meta-agent';

-- ============================================================================
-- META AGENT COMMANDS
-- ============================================================================
-- Audit trail of all commands processed by VALIS

CREATE TYPE meta_agent_intent AS ENUM (
    'status',           -- Get workforce/agent status
    'assign',           -- Assign task to agent
    'create_issue',     -- Create GitHub issue
    'query',            -- Answer questions about system state
    'spawn',            -- Spawn a new agent
    'terminate',        -- Terminate an agent
    'pause',            -- Pause an agent
    'resume',           -- Resume an agent
    'escalate',         -- Create escalation
    'broadcast',        -- Send message to multiple agents
    'unknown'           -- Could not determine intent
);

CREATE TYPE meta_agent_command_status AS ENUM (
    'processing',
    'completed',
    'failed',
    'rejected',
    'pending_confirmation'
);

CREATE TABLE meta_agent_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES meta_agent_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Input
    raw_message TEXT NOT NULL,
    
    -- Intent extraction
    intent meta_agent_intent NOT NULL,
    intent_confidence DECIMAL(3,2) NOT NULL CHECK (intent_confidence BETWEEN 0 AND 1),
    extracted_entities JSONB DEFAULT '{}'::jsonb,
    -- Stores: agent_names, task_descriptions, priorities, etc.
    
    -- Processing
    status meta_agent_command_status NOT NULL DEFAULT 'processing',
    
    -- Action taken
    action_type VARCHAR(50),          -- What action was performed
    action_target_id UUID,            -- ID of affected entity (agent_id, task_id, etc.)
    action_target_type VARCHAR(50),   -- Type of affected entity
    action_payload JSONB,             -- Data sent to perform action
    
    -- Result
    result JSONB,                     -- Structured result data
    result_summary TEXT,              -- Human-readable summary
    error_message TEXT,               -- If status = 'failed'
    error_details JSONB,              -- Detailed error info
    
    -- Response
    response_message TEXT NOT NULL,   -- Natural language response to CEO
    response_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Performance
    processing_time_ms INTEGER,       -- Time to process command
    tokens_used INTEGER,              -- LLM tokens consumed
    
    -- GitHub integration (for create_issue intent)
    github_issue_url TEXT,
    github_issue_number INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_agent_commands_tenant ON meta_agent_commands(tenant_id);
CREATE INDEX idx_meta_agent_commands_session ON meta_agent_commands(session_id);
CREATE INDEX idx_meta_agent_commands_user ON meta_agent_commands(user_id);
CREATE INDEX idx_meta_agent_commands_intent ON meta_agent_commands(tenant_id, intent);
CREATE INDEX idx_meta_agent_commands_status ON meta_agent_commands(tenant_id, status);
CREATE INDEX idx_meta_agent_commands_created ON meta_agent_commands(tenant_id, created_at DESC);
CREATE INDEX idx_meta_agent_commands_target ON meta_agent_commands(action_target_id) WHERE action_target_id IS NOT NULL;

COMMENT ON TABLE meta_agent_commands IS 'Audit trail of all VALIS meta-agent commands';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update session activity timestamp
CREATE OR REPLACE FUNCTION update_meta_agent_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE meta_agent_sessions
    SET 
        last_activity_at = NOW(),
        message_count = message_count + 1,
        command_count = command_count + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_activity_on_command
    AFTER INSERT ON meta_agent_commands
    FOR EACH ROW
    EXECUTE FUNCTION update_meta_agent_session_activity();

-- Function to get or create active session
CREATE OR REPLACE FUNCTION get_or_create_meta_agent_session(
    p_tenant_id UUID,
    p_user_id UUID,
    p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Look for active session
    SELECT id INTO v_session_id
    FROM meta_agent_sessions
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND status = 'active'
    ORDER BY last_activity_at DESC
    LIMIT 1;
    
    -- Create new session if none exists
    IF v_session_id IS NULL THEN
        INSERT INTO meta_agent_sessions (
            tenant_id,
            user_id,
            title,
            status
        ) VALUES (
            p_tenant_id,
            p_user_id,
            COALESCE(p_title, 'VALIS Session ' || NOW()::TEXT),
            'active'
        )
        RETURNING id INTO v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get session command history
CREATE OR REPLACE FUNCTION get_meta_agent_session_history(
    p_session_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    raw_message TEXT,
    intent meta_agent_intent,
    intent_confidence DECIMAL,
    status meta_agent_command_status,
    response_message TEXT,
    created_at TIMESTAMPTZ,
    processing_time_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mac.id,
        mac.raw_message,
        mac.intent,
        mac.intent_confidence,
        mac.status,
        mac.response_message,
        mac.created_at,
        mac.processing_time_ms
    FROM meta_agent_commands mac
    WHERE mac.session_id = p_session_id
    ORDER BY mac.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's recent sessions with stats
CREATE OR REPLACE FUNCTION get_user_meta_agent_sessions(
    p_tenant_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    status VARCHAR,
    message_count INTEGER,
    command_count INTEGER,
    last_activity_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mas.id,
        mas.title,
        mas.status,
        mas.message_count,
        mas.command_count,
        mas.last_activity_at,
        mas.started_at
    FROM meta_agent_sessions mas
    WHERE mas.tenant_id = p_tenant_id
      AND mas.user_id = p_user_id
    ORDER BY mas.last_activity_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE meta_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_agent_commands ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY tenant_isolation_sessions ON meta_agent_sessions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY own_sessions_only ON meta_agent_sessions
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Commands policies
CREATE POLICY tenant_isolation_commands ON meta_agent_commands
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY own_commands_only ON meta_agent_commands
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_meta_agent_sessions_updated_at
    BEFORE UPDATE ON meta_agent_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_agent_commands_updated_at
    BEFORE UPDATE ON meta_agent_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ACTIVITY LOGGING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION log_meta_agent_command_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (
        tenant_id,
        type,
        category,
        actor_type,
        actor_id,
        target_type,
        target_id,
        title,
        description,
        metadata
    ) VALUES (
        NEW.tenant_id,
        'meta_agent.command_processed',
        'system',
        'user',
        NEW.user_id,
        'meta_agent_command',
        NEW.id,
        'VALIS: ' || NEW.intent::TEXT,
        LEFT(NEW.raw_message, 200),
        jsonb_build_object(
            'intent', NEW.intent,
            'confidence', NEW.intent_confidence,
            'status', NEW.status,
            'session_id', NEW.session_id
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_meta_agent_activity
    AFTER INSERT ON meta_agent_commands
    FOR EACH ROW
    EXECUTE FUNCTION log_meta_agent_command_activity();

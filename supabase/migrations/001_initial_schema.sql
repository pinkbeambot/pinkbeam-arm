-- Migration: 001_initial_schema
-- Description: Core ARM database schema with multi-tenancy support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TENANTS (Multi-tenancy foundation)
-- ============================================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    
    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,
    limits JSONB DEFAULT '{
        "max_agents": 10,
        "max_tasks": 1000,
        "max_storage_mb": 1000
    }'::jsonb,
    
    -- Billing
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    billing_status VARCHAR(20) DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE tenants IS 'Workspace isolation - each customer gets a tenant';

-- ============================================================================
-- USERS (Authentication and profiles)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Auth (managed by Supabase Auth, this is extended profile)
    auth_id UUID UNIQUE, -- Links to auth.users
    email VARCHAR(255) NOT NULL,
    
    -- Profile
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    
    -- Preferences
    preferences JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{
        "email_escalations": true,
        "email_digest": "daily",
        "push_enabled": true
    }'::jsonb,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_active_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_auth ON users(auth_id);

COMMENT ON TABLE users IS 'Human users within a tenant/workspace';

-- ============================================================================
-- AGENTS (The AI workforce)
-- ============================================================================

CREATE TYPE agent_role AS ENUM ('ceo', 'manager', 'worker', 'specialist', 'system');
CREATE TYPE agent_status AS ENUM ('initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated');

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100),
    role agent_role NOT NULL DEFAULT 'worker',
    avatar_url TEXT,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    root_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
    
    -- Status
    status agent_status NOT NULL DEFAULT 'initializing',
    status_reason TEXT, -- Why in this status
    
    -- Capabilities (what this agent can do)
    capabilities TEXT[] DEFAULT '{}',
    -- spawn, delegate, decide, escalate, access_external, modify_config
    
    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,
    llm_config JSONB DEFAULT '{
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "temperature": 0.7,
        "max_tokens": 4096
    }'::jsonb,
    
    -- Limits
    limits JSONB DEFAULT '{
        "max_sub_agents": 5,
        "escalation_threshold": 0.7,
        "timeout_seconds": 300,
        "max_tokens_per_task": 100000,
        "max_cost_per_task_usd": 5.00
    }'::jsonb,
    
    -- Runtime state (ephemeral)
    session_id UUID,
    current_task_id UUID,
    
    -- Metrics
    stats JSONB DEFAULT '{
        "tasks_completed": 0,
        "tasks_failed": 0,
        "escalations_raised": 0,
        "avg_task_duration_seconds": 0,
        "total_cost_usd": 0
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_parent ON agents(parent_id);
CREATE INDEX idx_agents_root ON agents(root_id);
CREATE INDEX idx_agents_status ON agents(tenant_id, status);
CREATE INDEX idx_agents_role ON agents(tenant_id, role);

COMMENT ON TABLE agents IS 'AI agents in the workforce';

-- ============================================================================
-- TASKS (The work pipeline)
-- ============================================================================

CREATE TYPE task_status AS ENUM ('queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identity
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL DEFAULT 'generic',
    
    -- Assignment
    assignee_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    assigner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Status
    status task_status NOT NULL DEFAULT 'queued',
    priority task_priority NOT NULL DEFAULT 'normal',
    
    -- Hierarchy
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL DEFAULT 0,
    
    -- Content
    inputs JSONB DEFAULT '{}'::jsonb,
    expected_outputs JSONB DEFAULT '{}'::jsonb,
    outputs JSONB, -- Filled on completion
    
    -- Constraints
    deadline_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Progress
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    current_step TEXT,
    
    -- Cost tracking
    cost_usd DECIMAL(10,4) DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Search
    search_vector tsvector
);

CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_priority ON tasks(tenant_id, priority);
CREATE INDEX idx_tasks_deadline ON tasks(tenant_id, deadline_at);
CREATE INDEX idx_tasks_search ON tasks USING GIN(search_vector);

COMMENT ON TABLE tasks IS 'Work items assigned to agents';

-- ============================================================================
-- TASK DEPENDENCIES
-- ============================================================================

CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    dependency_type VARCHAR(20) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'requires', 'optional')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends ON task_dependencies(depends_on_task_id);

-- ============================================================================
-- DECISIONS (Audit trail)
-- ============================================================================

CREATE TYPE decision_status AS ENUM ('proposed', 'approved', 'rejected', 'overridden', 'executed');
CREATE TYPE decision_category AS ENUM ('action', 'resource', 'escalation', 'strategy', 'system');

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Who made the decision
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- What was decided
    category decision_category NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- The decision
    proposed_action JSONB NOT NULL,
    executed_action JSONB, -- May differ if overridden
    
    -- Reasoning
    reasoning JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Includes: context, analysis, options_considered, confidence, risks
    
    -- Authority
    self_authorized BOOLEAN DEFAULT false,
    required_approval_from VARCHAR(50),
    
    -- Status
    status decision_status NOT NULL DEFAULT 'proposed',
    
    -- Override
    overridden_by UUID REFERENCES users(id) ON DELETE SET NULL,
    override_reason TEXT,
    overridden_at TIMESTAMPTZ,
    
    -- Outcome
    outcome JSONB, -- Result of the decision
    
    -- Timestamps
    proposed_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    
    -- Immutability marker
    immutable BOOLEAN DEFAULT false
);

CREATE INDEX idx_decisions_tenant ON decisions(tenant_id);
CREATE INDEX idx_decisions_agent ON decisions(agent_id);
CREATE INDEX idx_decisions_task ON decisions(task_id);
CREATE INDEX idx_decisions_status ON decisions(tenant_id, status);
CREATE INDEX idx_decisions_proposed ON decisions(proposed_at);

COMMENT ON TABLE decisions IS 'Audit trail of all agent decisions';

-- ============================================================================
-- ESCALATIONS (Human intervention)
-- ============================================================================

CREATE TYPE escalation_type AS ENUM ('clarification', 'approval', 'error', 'edge_case', 'policy_violation');
CREATE TYPE escalation_status AS ENUM ('open', 'in_progress', 'resolved', 'dismissed');
CREATE TYPE escalation_urgency AS ENUM ('low', 'normal', 'high', 'critical');

CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Raised by
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Classification
    type escalation_type NOT NULL,
    urgency escalation_urgency NOT NULL DEFAULT 'normal',
    status escalation_status NOT NULL DEFAULT 'open',
    
    -- Content
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    situation_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Question/Request
    question JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Agent's analysis
    agent_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Resolution
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_type VARCHAR(50),
    resolution_answer TEXT,
    resolution_resources JSONB,
    learning_notes TEXT,
    
    -- Timing
    sla_deadline_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Metrics
    time_to_resolve_seconds INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalations_tenant ON escalations(tenant_id);
CREATE INDEX idx_escalations_agent ON escalations(agent_id);
CREATE INDEX idx_escalations_status ON escalations(tenant_id, status);
CREATE INDEX idx_escalations_urgency ON escalations(tenant_id, urgency);
CREATE INDEX idx_escalations_open ON escalations(tenant_id, status) WHERE status IN ('open', 'in_progress');

COMMENT ON TABLE escalations IS 'Human intervention requests from agents';

-- ============================================================================
-- ACTIVITIES (Event log / Activity feed)
-- ============================================================================

CREATE TYPE activity_type AS ENUM (
    'agent.spawned', 'agent.status_changed', 'agent.terminated',
    'task.created', 'task.assigned', 'task.started', 'task.progress', 'task.completed', 'task.failed',
    'decision.proposed', 'decision.made', 'decision.overridden',
    'escalation.created', 'escalation.resolved',
    'message.sent', 'message.received',
    'system.error', 'system.config_changed'
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event classification
    type activity_type NOT NULL,
    category VARCHAR(50) NOT NULL, -- agent, task, decision, escalation, system
    
    -- Actors
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('agent', 'user', 'system')),
    actor_id UUID NOT NULL,
    
    -- Target (what was affected)
    target_type VARCHAR(50),
    target_id UUID,
    
    -- Content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- For real-time ordering
    sequence_number BIGSERIAL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_tenant ON activities(tenant_id);
CREATE INDEX idx_activities_type ON activities(tenant_id, type);
CREATE INDEX idx_activities_agent ON activities(agent_id);
CREATE INDEX idx_activities_task ON activities(task_id);
CREATE INDEX idx_activities_sequence ON activities(tenant_id, sequence_number);
CREATE INDEX idx_activities_created ON activities(tenant_id, created_at DESC);

-- Partition by tenant for large scale
-- CREATE TABLE activities PARTITION BY LIST (tenant_id); -- Enable for scale

COMMENT ON TABLE activities IS 'Event log for audit trail and activity feed';

-- ============================================================================
-- MESSAGES (Agent-to-agent messaging)
-- ============================================================================

CREATE TYPE message_type AS ENUM (
    'spawn.request', 'spawn.response',
    'task.assign', 'task.accept', 'task.reject', 'task.progress', 'task.complete', 'task.fail',
    'decision.propose', 'decision.confirm', 'decision.override',
    'escalate.request', 'escalate.response',
    'message.direct', 'message.broadcast',
    'system.ping', 'system.pong', 'system.config.update', 'system.error'
);

CREATE TYPE message_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Protocol
    protocol_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    message_type message_type NOT NULL,
    
    -- Routing
    from_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    to_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    to_broadcast BOOLEAN DEFAULT false,
    
    -- Threading
    thread_id UUID,
    correlation_id UUID,
    
    -- Content
    payload JSONB NOT NULL,
    priority message_priority DEFAULT 'normal',
    
    -- Status
    requires_ack BOOLEAN DEFAULT false,
    acked_at TIMESTAMPTZ,
    
    -- Tracing
    trace JSONB DEFAULT '[]'::jsonb,
    
    -- TTL
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_from ON messages(from_agent_id);
CREATE INDEX idx_messages_to ON messages(to_agent_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_correlation ON messages(correlation_id);
CREATE INDEX idx_messages_created ON messages(tenant_id, created_at DESC);

COMMENT ON TABLE messages IS 'Agent-to-agent message protocol storage';

-- ============================================================================
-- AGENT SESSIONS (Runtime state)
-- ============================================================================

CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Session info
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Context
    context JSONB DEFAULT '{}'::jsonb, -- Working memory
    message_history JSONB DEFAULT '[]'::jsonb,
    
    -- Runtime
    runtime_version VARCHAR(50),
    environment VARCHAR(50),
    
    -- Metrics
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0,
    
    UNIQUE(agent_id)
);

CREATE INDEX idx_sessions_tenant ON agent_sessions(tenant_id);
CREATE INDEX idx_sessions_agent ON agent_sessions(agent_id);

COMMENT ON TABLE agent_sessions IS 'Active agent runtime sessions';

-- ============================================================================
-- ANALYTICS (Aggregated metrics)
-- ============================================================================

CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Task metrics
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    avg_task_duration_seconds INTEGER,
    
    -- Agent metrics
    active_agents INTEGER DEFAULT 0,
    agent_spawns INTEGER DEFAULT 0,
    agent_terminations INTEGER DEFAULT 0,
    
    -- Decision metrics
    decisions_made INTEGER DEFAULT 0,
    decisions_overridden INTEGER DEFAULT 0,
    
    -- Escalation metrics
    escalations_created INTEGER DEFAULT 0,
    escalations_resolved INTEGER DEFAULT 0,
    avg_resolution_time_seconds INTEGER,
    
    -- Cost metrics
    total_cost_usd DECIMAL(10,4) DEFAULT 0,
    
    -- Custom metrics
    custom_metrics JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, date)
);

CREATE INDEX idx_analytics_tenant ON analytics_daily(tenant_id);
CREATE INDEX idx_analytics_date ON analytics_daily(date);

COMMENT ON TABLE analytics_daily IS 'Daily aggregated metrics per tenant';

-- ============================================================================
-- FILES / ARTIFACTS
-- ============================================================================

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Ownership
    uploaded_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- File info
    original_name VARCHAR(500),
    storage_path TEXT NOT NULL,
    content_type VARCHAR(255),
    size_bytes BIGINT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_tenant ON files(tenant_id);
CREATE INDEX idx_files_task ON files(task_id);

COMMENT ON TABLE files IS 'File artifacts generated by agents';

-- ============================================================================
-- UPDATED AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalations_updated_at BEFORE UPDATE ON escalations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON analytics_daily
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration: 012_agent_execute_helpers
-- Description: Helper functions for agent-execute edge function

-- Function to increment agent cost and tokens
CREATE OR REPLACE FUNCTION increment_agent_cost(
    p_agent_id UUID,
    p_cost_usd NUMERIC,
    p_tokens INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE agents
    SET 
        stats = jsonb_set(
            jsonb_set(
                stats,
                '{total_cost_usd}',
                (COALESCE(stats->>'total_cost_usd', '0')::numeric + p_cost_usd)::text::jsonb
            ),
            '{total_tokens_used}',
            (COALESCE(stats->>'total_tokens_used', '0')::int + p_tokens)::text::jsonb
        ),
        updated_at = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment agent completed task count and update avg duration
CREATE OR REPLACE FUNCTION increment_agent_task_completed(
    p_agent_id UUID,
    p_execution_time INTEGER
)
RETURNS void AS $$
DECLARE
    v_current_completed INTEGER;
    v_current_avg INTEGER;
    v_new_avg INTEGER;
BEGIN
    SELECT 
        COALESCE(stats->>'tasks_completed', '0')::int,
        COALESCE(stats->>'avg_task_duration_seconds', '0')::int
    INTO v_current_completed, v_current_avg
    FROM agents
    WHERE id = p_agent_id;

    IF v_current_completed > 0 THEN
        v_new_avg := ((v_current_avg * v_current_completed) + p_execution_time) / (v_current_completed + 1);
    ELSE
        v_new_avg := p_execution_time;
    END IF;

    UPDATE agents
    SET 
        stats = jsonb_set(
            jsonb_set(
                stats,
                '{tasks_completed}',
                (v_current_completed + 1)::text::jsonb
            ),
            '{avg_task_duration_seconds}',
            v_new_avg::text::jsonb
        ),
        updated_at = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment agent failed task count
CREATE OR REPLACE FUNCTION increment_agent_task_failed(
    p_agent_id UUID
)
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

-- Function to check and timeout stale tasks
CREATE OR REPLACE FUNCTION timeout_stale_tasks(
    p_max_idle_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    task_id UUID,
    agent_id UUID,
    tenant_id UUID
) AS $$
BEGIN
    RETURN QUERY
    UPDATE tasks t
    SET 
        status = 'failed',
        outputs = jsonb_build_object(
            'error', 'Task timed out due to inactivity',
            'timeout_at', NOW(),
            'previous_status', t.status
        ),
        updated_at = NOW()
    FROM agents a
    WHERE t.assignee_id = a.id
    AND t.status = 'in_progress'
    AND t.updated_at < NOW() - INTERVAL '1 minute' * p_max_idle_minutes
    RETURNING t.id, t.assignee_id, t.tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get tasks nearing timeout
CREATE OR REPLACE FUNCTION get_tasks_nearing_timeout(
    p_warning_minutes INTEGER DEFAULT 25
)
RETURNS TABLE (
    task_id UUID,
    agent_id UUID,
    tenant_id UUID,
    title VARCHAR,
    minutes_inactive INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.assignee_id,
        t.tenant_id,
        t.title,
        EXTRACT(EPOCH FROM (NOW() - t.updated_at))::INTEGER / 60 as minutes_inactive
    FROM tasks t
    WHERE t.status = 'in_progress'
    AND t.updated_at < NOW() - INTERVAL '1 minute' * p_warning_minutes
    ORDER BY t.updated_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate state transition
CREATE OR REPLACE FUNCTION validate_state_transition(
    p_current_state VARCHAR,
    p_new_state VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid_transitions JSONB;
BEGIN
    v_valid_transitions := '{
        "initializing": ["idle", "error", "terminated"],
        "idle": ["active", "paused", "error", "terminated"],
        "active": ["idle", "paused", "blocked", "error", "terminated"],
        "paused": ["idle", "active", "terminated"],
        "blocked": ["active", "error", "terminated"],
        "error": ["idle", "paused", "terminated"],
        "escaped": ["idle", "terminated"],
        "terminated": []
    }'::JSONB;
    
    RETURN p_new_state = ANY(ARRAY(
        SELECT jsonb_array_elements_text(v_valid_transitions->p_current_state)
    ));
END;
$$ LANGUAGE plpgsql;

-- Function to transition agent state with validation
CREATE OR REPLACE FUNCTION transition_agent_state(
    p_agent_id UUID,
    p_new_state VARCHAR,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_state VARCHAR;
    v_is_valid BOOLEAN;
BEGIN
    SELECT status INTO v_current_state
    FROM agents
    WHERE id = p_agent_id;
    
    IF v_current_state IS NULL THEN
        RETURN false;
    END IF;
    
    v_is_valid := validate_state_transition(v_current_state, p_new_state);
    
    IF NOT v_is_valid THEN
        RETURN false;
    END IF;
    
    UPDATE agents
    SET 
        status = p_new_state,
        status_reason = p_reason,
        updated_at = NOW(),
        activated_at = CASE WHEN p_new_state = 'idle' AND v_current_state = 'initializing' THEN NOW() ELSE activated_at END,
        terminated_at = CASE WHEN p_new_state = 'terminated' THEN NOW() ELSE terminated_at END
    WHERE id = p_agent_id;
    
    INSERT INTO agent_lifecycle_events (
        tenant_id,
        agent_id,
        event_type,
        previous_state,
        new_state,
        triggered_by_type,
        reason
    )
    SELECT 
        tenant_id,
        p_agent_id,
        p_new_state,
        v_current_state,
        p_new_state,
        'system',
        p_reason
    FROM agents
    WHERE id = p_agent_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to find available agent for task assignment
CREATE OR REPLACE FUNCTION find_available_agent(
    p_tenant_id UUID,
    p_capabilities TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS TABLE (
    agent_id UUID,
    agent_name VARCHAR,
    current_task_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        COUNT(t.id)::INTEGER as task_count
    FROM agents a
    LEFT JOIN tasks t ON t.assignee_id = a.id AND t.status IN ('queued', 'in_progress')
    WHERE a.tenant_id = p_tenant_id
    AND a.status = 'idle'
    AND (p_capabilities = '{}'::TEXT[] OR a.capabilities @> p_capabilities)
    GROUP BY a.id, a.name
    ORDER BY COUNT(t.id) ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- View for daily cost aggregation per agent
CREATE OR REPLACE VIEW agent_daily_costs AS
SELECT 
    tenant_id,
    agent_id,
    DATE(created_at) as date,
    COUNT(*) as task_count,
    SUM(cost_usd) as total_cost_usd,
    SUM(tokens_used) as total_tokens
FROM tasks
WHERE status = 'completed'
AND completed_at IS NOT NULL
GROUP BY tenant_id, agent_id, DATE(created_at);

-- View for tenant cost summary
CREATE OR REPLACE VIEW tenant_cost_summary AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(DISTINCT a.id) as active_agents,
    COUNT(DISTINCT task.id) as total_tasks,
    COALESCE(SUM(task.cost_usd), 0) as total_cost_usd,
    COALESCE(SUM(task.tokens_used), 0) as total_tokens
FROM tenants t
LEFT JOIN agents a ON a.tenant_id = t.id AND a.status != 'terminated'
LEFT JOIN tasks task ON task.tenant_id = t.id
GROUP BY t.id, t.name;

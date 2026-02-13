-- Migration: 010_activity_feed_enhancements
-- Description: Activity feed backend enhancements - triggers, realtime, and RLS policies

-- ============================================================================
-- ACTIVITY TYPE EXTENSIONS
-- ============================================================================

-- Note: The activity_type enum is already defined in migration 001.
-- The existing types cover: agent.spawned, agent.status_changed, agent.terminated,
-- task.created, task.assigned, task.started, task.progress, task.completed, task.failed,
-- decision.proposed, decision.made, decision.overridden,
-- escalation.created, escalation.resolved,
-- message.sent, message.received,
-- system.error, system.config_changed

-- ============================================================================
-- ENHANCED ACTIVITY LOGGING TRIGGER
-- ============================================================================

-- Drop existing trigger to recreate with enhanced logic
DROP TRIGGER IF EXISTS agents_activity_trigger ON agents;
DROP TRIGGER IF EXISTS tasks_activity_trigger ON tasks;
DROP TRIGGER IF EXISTS decisions_activity_trigger ON decisions;
DROP TRIGGER IF EXISTS escalations_activity_trigger ON escalations;

-- Recreate the enhanced log_activity function
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_actor_id UUID;
    v_actor_type VARCHAR(20);
    v_title VARCHAR(500);
    v_description TEXT;
    v_metadata JSONB := '{}'::jsonb;
    v_type activity_type;
    v_category VARCHAR(50);
    v_agent_id UUID;
    v_task_id UUID;
    v_target_name TEXT;
BEGIN
    -- Determine context based on table
    CASE TG_TABLE_NAME
        WHEN 'agents' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := NEW.id;
            v_actor_type := 'system';
            v_agent_id := NEW.id;
            v_category := 'agent';
            v_target_name := NEW.name;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'agent.spawned';
                v_title := 'Agent created';
                v_description := format('Agent "%s" (%s) was created', NEW.name, NEW.role);
                v_metadata := jsonb_build_object(
                    'agent_role', NEW.role,
                    'agent_status', NEW.status,
                    'parent_id', NEW.parent_id
                );
            ELSIF TG_OP = 'UPDATE' THEN
                -- Status change
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    IF NEW.status = 'terminated' THEN
                        v_type := 'agent.terminated';
                        v_title := 'Agent terminated';
                        v_description := format('Agent "%s" was terminated', NEW.name);
                    ELSE
                        v_type := 'agent.status_changed';
                        v_title := 'Agent status changed';
                        v_description := format('Agent "%s" changed from %s to %s', NEW.name, OLD.status, NEW.status);
                    END IF;
                    v_metadata := jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'status_reason', NEW.status_reason
                );
                -- LLM config change
                ELSIF OLD.llm_config IS DISTINCT FROM NEW.llm_config THEN
                    v_type := 'system.config_changed';
                    v_title := 'Agent configuration updated';
                    v_description := format('Agent "%s" configuration was modified', NEW.name);
                    v_category := 'system';
                    v_metadata := jsonb_build_object(
                        'config_type', 'llm',
                        'agent_id', NEW.id
                    );
                ELSE
                    -- Generic update, don't log
                    RETURN NEW;
                END IF;
            END IF;
            
        WHEN 'tasks' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := COALESCE(NEW.assignee_id, NEW.assigner_id, NEW.id);
            v_actor_type := CASE WHEN NEW.assignee_id IS NOT NULL THEN 'agent' ELSE 'user' END;
            v_agent_id := NEW.assignee_id;
            v_task_id := NEW.id;
            v_category := 'task';
            v_target_name := NEW.title;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'task.created';
                v_title := 'Task created';
                v_description := format('Task "%s" was created', NEW.title);
                v_metadata := jsonb_build_object(
                    'task_type', NEW.type,
                    'priority', NEW.priority,
                    'assignee_id', NEW.assignee_id
                );
            ELSIF TG_OP = 'UPDATE' THEN
                -- Status changes
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    IF OLD.status = 'queued' AND NEW.status = 'in_progress' THEN
                        v_type := 'task.started';
                        v_title := 'Task started';
                        v_description := format('Task "%s" was started', NEW.title);
                    ELSIF NEW.status = 'completed' THEN
                        v_type := 'task.completed';
                        v_title := 'Task completed';
                        v_description := format('Task "%s" was completed', NEW.title);
                        v_metadata := jsonb_build_object(
                            'duration_seconds', EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
                            'cost_usd', NEW.cost_usd,
                            'tokens_used', NEW.tokens_used
                        );
                    ELSIF NEW.status = 'failed' THEN
                        v_type := 'task.failed';
                        v_title := 'Task failed';
                        v_description := format('Task "%s" failed', NEW.title);
                    ELSIF NEW.status = 'blocked' THEN
                        v_type := 'task.progress';
                        v_title := 'Task blocked';
                        v_description := format('Task "%s" is blocked', NEW.title);
                    ELSE
                        v_type := 'task.progress';
                        v_title := 'Task status updated';
                        v_description := format('Task "%s" moved to %s', NEW.title, NEW.status);
                    END IF;
                    
                    v_metadata := v_metadata || jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'progress_percent', NEW.progress_percent
                    );
                -- Assignment change
                ELSIF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
                    v_type := 'task.assigned';
                    v_title := 'Task assigned';
                    v_description := format('Task "%s" assigned to agent', NEW.title);
                    v_metadata := jsonb_build_object(
                        'previous_assignee', OLD.assignee_id,
                        'new_assignee', NEW.assignee_id
                    );
                -- Progress update
                ELSIF OLD.progress_percent IS DISTINCT FROM NEW.progress_percent AND NEW.progress_percent > 0 THEN
                    v_type := 'task.progress';
                    v_title := 'Task progress updated';
                    v_description := format('Task "%s" is %s%% complete', NEW.title, NEW.progress_percent);
                    v_metadata := jsonb_build_object(
                        'progress_percent', NEW.progress_percent,
                        'current_step', NEW.current_step
                    );
                ELSE
                    -- Generic update, don't log
                    RETURN NEW;
                END IF;
            END IF;
            
        WHEN 'decisions' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := NEW.agent_id;
            v_actor_type := 'agent';
            v_agent_id := NEW.agent_id;
            v_task_id := NEW.task_id;
            v_category := 'decision';
            v_target_name := NEW.title;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'decision.proposed';
                v_title := 'Decision proposed';
                v_description := format('Decision "%s" proposed', NEW.title);
                v_metadata := jsonb_build_object(
                    'category', NEW.category,
                    'confidence', NEW.reasoning->>'confidence',
                    'self_authorized', NEW.self_authorized
                );
            ELSIF TG_OP = 'UPDATE' THEN
                IF NEW.status = 'approved' AND OLD.status = 'proposed' THEN
                    v_type := 'decision.made';
                    v_title := 'Decision approved';
                    v_description := format('Decision "%s" was approved', NEW.title);
                    v_metadata := jsonb_build_object(
                        'decided_at', NEW.decided_at,
                        'category', NEW.category
                    );
                ELSIF NEW.status = 'overridden' AND OLD.status != 'overridden' THEN
                    v_type := 'decision.overridden';
                    v_title := 'Decision overridden';
                    v_description := format('Decision "%s" was overridden by human', NEW.title);
                    v_metadata := jsonb_build_object(
                        'overridden_by', NEW.overridden_by,
                        'override_reason', NEW.override_reason,
                        'overridden_at', NEW.overridden_at
                    );
                ELSIF NEW.status = 'executed' AND OLD.status != 'executed' THEN
                    v_type := 'decision.made';
                    v_title := 'Decision executed';
                    v_description := format('Decision "%s" was executed', NEW.title);
                    v_metadata := jsonb_build_object(
                        'executed_at', NEW.executed_at,
                        'outcome', NEW.outcome
                    );
                ELSE
                    -- Don't log other decision updates
                    RETURN NEW;
                END IF;
            END IF;
            
        WHEN 'escalations' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := NEW.agent_id;
            v_actor_type := 'agent';
            v_agent_id := NEW.agent_id;
            v_task_id := NEW.task_id;
            v_category := 'escalation';
            v_target_name := NEW.title;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'escalation.created';
                v_title := 'Escalation created';
                v_description := format('Escalation "%s" created (%s)', NEW.title, NEW.urgency);
                v_metadata := jsonb_build_object(
                    'type', NEW.type,
                    'urgency', NEW.urgency,
                    'sla_deadline', NEW.sla_deadline_at
                );
            ELSIF TG_OP = 'UPDATE' AND NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
                v_type := 'escalation.resolved';
                v_title := 'Escalation resolved';
                v_description := format('Escalation "%s" was resolved', NEW.title);
                v_metadata := jsonb_build_object(
                    'resolved_by', NEW.resolved_by,
                    'resolution_type', NEW.resolution_type,
                    'time_to_resolve_seconds', NEW.time_to_resolve_seconds
                );
            ELSE
                -- Don't log other escalation updates
                RETURN NEW;
            END IF;
    END CASE;
    
    -- Insert activity if we have a type
    IF v_type IS NOT NULL THEN
        INSERT INTO activities (
            tenant_id, type, category, actor_type, actor_id,
            target_type, target_id, title, description, metadata,
            agent_id, task_id
        ) VALUES (
            v_tenant_id, v_type, v_category, v_actor_type, v_actor_id,
            TG_TABLE_NAME, CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
            v_title, v_description, v_metadata,
            v_agent_id, v_task_id
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers for activity logging
CREATE TRIGGER agents_activity_trigger
    AFTER INSERT OR UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER tasks_activity_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER decisions_activity_trigger
    AFTER INSERT OR UPDATE ON decisions
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER escalations_activity_trigger
    AFTER INSERT OR UPDATE ON escalations
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- ============================================================================
-- REALTIME SUBSCRIPTION SETUP
-- ============================================================================

-- Ensure activities table is in realtime publication
DO $$
BEGIN
    -- Add activities table to realtime publication if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'activities'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE activities;
    END IF;
END$$;

-- ============================================================================
-- RLS POLICIES FOR ACTIVITIES
-- ============================================================================

-- Activities are already covered by the tenant_isolation policy in migration 002
-- Additional policies for specific access patterns

-- Allow users to view activities for their tenant
DROP POLICY IF EXISTS activities_select_tenant ON activities;
CREATE POLICY activities_select_tenant ON activities
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Service role can manage all activities
DROP POLICY IF EXISTS activities_service_bypass ON activities;
CREATE POLICY activities_service_bypass ON activities
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- ACTIVITY RETENTION AND CLEANUP
-- ============================================================================

-- Function to archive old activities (move to archive table)
CREATE OR REPLACE FUNCTION archive_old_activities(p_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Create archive table if not exists
    CREATE TABLE IF NOT EXISTS activities_archive (
        LIKE activities INCLUDING ALL,
        archived_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Move old activities to archive
    WITH archived AS (
        DELETE FROM activities 
        WHERE created_at < NOW() - INTERVAL '1 day' * p_days
        RETURNING *
    )
    INSERT INTO activities_archive
    SELECT *, NOW() FROM archived;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old archived activities
CREATE OR REPLACE FUNCTION purge_archived_activities(p_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM activities_archive 
    WHERE archived_at < NOW() - INTERVAL '1 day' * p_days;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ACTIVITY ANALYTICS FUNCTIONS
-- ============================================================================

-- Function to get activity summary for a time period
CREATE OR REPLACE FUNCTION get_activity_summary(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
    category VARCHAR,
    activity_count BIGINT,
    unique_actors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.category,
        COUNT(*) as activity_count,
        COUNT(DISTINCT a.actor_id) as unique_actors
    FROM activities a
    WHERE a.tenant_id = p_tenant_id
        AND a.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY a.category
    ORDER BY activity_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent activity for a specific agent
CREATE OR REPLACE FUNCTION get_agent_activity(
    p_agent_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS SETOF activities AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM activities
    WHERE agent_id = p_agent_id
       OR actor_id = p_agent_id
    ORDER BY sequence_number DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for common activity queries
CREATE INDEX IF NOT EXISTS idx_activities_tenant_created 
    ON activities(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_actor 
    ON activities(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_target 
    ON activities(target_type, target_id, created_at DESC);

-- Partial index for recent activities (last 7 days) - for fast recent feed queries
CREATE INDEX IF NOT EXISTS idx_activities_recent 
    ON activities(tenant_id, sequence_number DESC)
    WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION log_activity() IS 'Enhanced trigger function for logging activities from various tables';
COMMENT ON FUNCTION archive_old_activities(INTEGER) IS 'Archives activities older than specified days to activities_archive table';
COMMENT ON FUNCTION purge_archived_activities(INTEGER) IS 'Permanently deletes archived activities older than specified days';
COMMENT ON FUNCTION get_activity_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns activity summary by category for a tenant and time period';
COMMENT ON FUNCTION get_agent_activity(UUID, INTEGER) IS 'Returns recent activities for a specific agent';

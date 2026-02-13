-- Migration: 003_triggers_and_functions
-- Description: Database triggers and utility functions

-- ============================================================================
-- ACTIVITY LOGGING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_actor_id UUID;
    v_actor_type VARCHAR(20);
    v_title VARCHAR(500);
    v_description TEXT;
    v_metadata JSONB;
    v_type activity_type;
    v_category VARCHAR(50);
    v_agent_id UUID;
    v_task_id UUID;
BEGIN
    -- Determine context based on table
    CASE TG_TABLE_NAME
        WHEN 'agents' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := NEW.id;
            v_actor_type := 'system';
            v_agent_id := NEW.id;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'agent.spawned';
                v_title := 'Agent created';
                v_description := format('Agent "%s" (%s) was created', NEW.name, NEW.role);
                v_category := 'agent';
            ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
                v_type := 'agent.status_changed';
                v_title := 'Agent status changed';
                v_description := format('Agent "%s" changed from %s to %s', NEW.name, OLD.status, NEW.status);
                v_category := 'agent';
            END IF;
            
        WHEN 'tasks' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := COALESCE(NEW.assignee_id, NEW.assigner_id, NEW.id);
            v_actor_type := CASE WHEN NEW.assignee_id IS NOT NULL THEN 'agent' ELSE 'system' END;
            v_agent_id := NEW.assignee_id;
            v_task_id := NEW.id;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'task.created';
                v_title := 'Task created';
                v_description := format('Task "%s" was created', NEW.title);
                v_category := 'task';
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status = 'queued' AND NEW.status = 'in_progress' THEN
                    v_type := 'task.started';
                    v_title := 'Task started';
                    v_description := format('Task "%s" was started', NEW.title);
                ELSIF NEW.status = 'completed' THEN
                    v_type := 'task.completed';
                    v_title := 'Task completed';
                    v_description := format('Task "%s" was completed', NEW.title);
                ELSIF NEW.status = 'failed' THEN
                    v_type := 'task.failed';
                    v_title := 'Task failed';
                    v_description := format('Task "%s" failed', NEW.title);
                ELSIF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
                    v_type := 'task.assigned';
                    v_title := 'Task assigned';
                    v_description := format('Task "%s" assigned to agent', NEW.title);
                END IF;
                v_category := 'task';
            END IF;
            
        WHEN 'decisions' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := NEW.agent_id;
            v_actor_type := 'agent';
            v_agent_id := NEW.agent_id;
            v_task_id := NEW.task_id;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'decision.proposed';
                v_title := 'Decision proposed';
                v_description := format('Decision "%s" proposed with %s%% confidence', NEW.title, 
                    (NEW.reasoning->>'confidence')::numeric * 100);
                v_category := 'decision';
            ELSIF TG_OP = 'UPDATE' THEN
                IF NEW.status = 'approved' AND OLD.status = 'proposed' THEN
                    v_type := 'decision.made';
                    v_title := 'Decision approved';
                    v_description := format('Decision "%s" was approved', NEW.title);
                ELSIF NEW.status = 'overridden' THEN
                    v_type := 'decision.overridden';
                    v_title := 'Decision overridden';
                    v_description := format('Decision "%s" was overridden by human', NEW.title);
                END IF;
                v_category := 'decision';
            END IF;
            
        WHEN 'escalations' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := NEW.agent_id;
            v_actor_type := 'agent';
            v_agent_id := NEW.agent_id;
            v_task_id := NEW.task_id;
            
            IF TG_OP = 'INSERT' THEN
                v_type := 'escalation.created';
                v_title := 'Escalation created';
                v_description := format('Escalation "%s" created (%s)', NEW.title, NEW.urgency);
                v_category := 'escalation';
            ELSIF TG_OP = 'UPDATE' AND NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
                v_type := 'escalation.resolved';
                v_title := 'Escalation resolved';
                v_description := format('Escalation "%s" was resolved', NEW.title);
                v_category := 'escalation';
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

-- Create triggers for activity logging
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
-- TASK STATUS AUTOMATION
-- ============================================================================

-- Auto-update task status when dependencies complete
CREATE OR REPLACE FUNCTION check_task_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    -- If a task was just completed, check if it was blocking others
    IF NEW.status = 'completed' THEN
        UPDATE tasks t
        SET status = 'queued'
        WHERE t.id IN (
            SELECT td.task_id
            FROM task_dependencies td
            WHERE td.depends_on_task_id = NEW.id
            AND td.dependency_type = 'blocks'
            AND NOT EXISTS (
                SELECT 1 FROM task_dependencies td2
                JOIN tasks t2 ON td2.depends_on_task_id = t2.id
                WHERE td2.task_id = td.task_id
                AND t2.status != 'completed'
            )
        )
        AND t.status = 'blocked';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_dependency_check
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION check_task_dependencies();

-- ============================================================================
-- AGENT STATS UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agent stats when tasks complete/fail
    IF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
            UPDATE agents
            SET stats = jsonb_set(
                stats,
                '{tasks_completed}',
                to_jsonb((stats->>'tasks_completed')::int + 1)
            )
            WHERE id = NEW.assignee_id;
        ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
            UPDATE agents
            SET stats = jsonb_set(
                stats,
                '{tasks_failed}',
                to_jsonb((stats->>'tasks_failed')::int + 1)
            )
            WHERE id = NEW.assignee_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_agent_stats
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_agent_stats();

-- ============================================================================
-- SEARCH VECTOR UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_task_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_search_vector_update
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_task_search_vector();

-- ============================================================================
-- ANALYTICS ROLLUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION rollup_daily_analytics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO analytics_daily (
        tenant_id, date,
        tasks_created, tasks_completed, tasks_failed,
        active_agents, agent_spawns,
        decisions_made, decisions_overridden,
        escalations_created, escalations_resolved
    )
    SELECT 
        t.id as tenant_id,
        p_date as date,
        COALESCE((SELECT count(*) FROM tasks WHERE tenant_id = t.id AND DATE(created_at) = p_date), 0) as tasks_created,
        COALESCE((SELECT count(*) FROM tasks WHERE tenant_id = t.id AND DATE(completed_at) = p_date AND status = 'completed'), 0) as tasks_completed,
        COALESCE((SELECT count(*) FROM tasks WHERE tenant_id = t.id AND DATE(updated_at) = p_date AND status = 'failed'), 0) as tasks_failed,
        COALESCE((SELECT count(*) FROM agents WHERE tenant_id = t.id AND status IN ('idle', 'active')), 0) as active_agents,
        COALESCE((SELECT count(*) FROM agents WHERE tenant_id = t.id AND DATE(created_at) = p_date), 0) as agent_spawns,
        COALESCE((SELECT count(*) FROM decisions WHERE tenant_id = t.id AND DATE(executed_at) = p_date), 0) as decisions_made,
        COALESCE((SELECT count(*) FROM decisions WHERE tenant_id = t.id AND DATE(overridden_at) = p_date), 0) as decisions_overridden,
        COALESCE((SELECT count(*) FROM escalations WHERE tenant_id = t.id AND DATE(created_at) = p_date), 0) as escalations_created,
        COALESCE((SELECT count(*) FROM escalations WHERE tenant_id = t.id AND DATE(resolved_at) = p_date), 0) as escalations_resolved
    FROM tenants t
    ON CONFLICT (tenant_id, date) DO UPDATE SET
        tasks_created = EXCLUDED.tasks_created,
        tasks_completed = EXCLUDED.tasks_completed,
        tasks_failed = EXCLUDED.tasks_failed,
        active_agents = EXCLUDED.active_agents,
        agent_spawns = EXCLUDED.agent_spawns,
        decisions_made = EXCLUDED.decisions_made,
        decisions_overridden = EXCLUDED.decisions_overridden,
        escalations_created = EXCLUDED.escalations_created,
        escalations_resolved = EXCLUDED.escalations_resolved,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_activities(p_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Move old activities to archive (implementation depends on storage strategy)
    -- For now, just delete old activities
    DELETE FROM activities 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get agent hierarchy (all descendants)
CREATE OR REPLACE FUNCTION get_agent_descendants(p_agent_id UUID)
RETURNS TABLE(id UUID, name VARCHAR, depth INTEGER, path UUID[]) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE descendants AS (
        SELECT a.id, a.name, 0 as depth, ARRAY[a.id] as path
        FROM agents a
        WHERE a.id = p_agent_id
        
        UNION ALL
        
        SELECT a.id, a.name, d.depth + 1, d.path || a.id
        FROM agents a
        JOIN descendants d ON a.parent_id = d.id
    )
    SELECT * FROM descendants;
END;
$$ LANGUAGE plpgsql;

-- Get task chain (all related tasks)
CREATE OR REPLACE FUNCTION get_task_chain(p_task_id UUID)
RETURNS TABLE(id UUID, title VARCHAR, status task_status, depth INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE task_chain AS (
        SELECT t.id, t.title, t.status, 0 as depth
        FROM tasks t
        WHERE t.id = p_task_id
        
        UNION ALL
        
        SELECT t.id, t.title, t.status, tc.depth + 1
        FROM tasks t
        JOIN task_chain tc ON t.parent_task_id = tc.id
    )
    SELECT * FROM task_chain;
END;
$$ LANGUAGE plpgsql;

-- Calculate escalation SLA deadline
CREATE OR REPLACE FUNCTION calculate_escalation_sla(p_urgency escalation_urgency)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN CASE p_urgency
        WHEN 'critical' THEN NOW() + INTERVAL '1 hour'
        WHEN 'high' THEN NOW() + INTERVAL '4 hours'
        WHEN 'normal' THEN NOW() + INTERVAL '24 hours'
        WHEN 'low' THEN NOW() + INTERVAL '72 hours'
    END;
END;
$$ LANGUAGE plpgsql;

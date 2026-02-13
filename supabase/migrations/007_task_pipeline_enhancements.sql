-- Migration: 007_task_pipeline_enhancements
-- Description: Task Pipeline Backend enhancements for ARM-004

-- ============================================================================
-- CIRCULAR DEPENDENCY CHECK
-- ============================================================================

CREATE OR REPLACE FUNCTION check_circular_dependency(
    p_task_id UUID,
    p_depends_on_task_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check if adding this dependency would create a cycle
    -- by traversing from the depends_on_task back to the task
    WITH RECURSIVE dependency_chain AS (
        -- Start from the task we want to depend on
        SELECT td.depends_on_task_id as task_id, 1 as depth
        FROM task_dependencies td
        WHERE td.task_id = p_depends_on_task_id
        
        UNION ALL
        
        -- Follow the chain
        SELECT td.depends_on_task_id, dc.depth + 1
        FROM task_dependencies td
        JOIN dependency_chain dc ON td.task_id = dc.task_id
        WHERE dc.depth < 100  -- Prevent infinite loops
    )
    SELECT COUNT(*) INTO v_count
    FROM dependency_chain
    WHERE task_id = p_task_id;
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENHANCED TASK DEPENDENCY MANAGEMENT
-- ============================================================================

-- Function to automatically block/unblock tasks based on dependencies
CREATE OR REPLACE FUNCTION manage_task_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    -- When a task is completed
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Unblock tasks that were waiting on this one
        UPDATE tasks t
        SET status = 'queued'
        WHERE t.id IN (
            -- Find tasks that depend on this completed task
            SELECT td.task_id
            FROM task_dependencies td
            WHERE td.depends_on_task_id = NEW.id
            AND td.dependency_type = 'blocks'
        )
        AND t.status = 'blocked'
        AND NOT EXISTS (
            -- Ensure no other blocking dependencies are still incomplete
            SELECT 1 FROM task_dependencies td2
            JOIN tasks t2 ON td2.depends_on_task_id = t2.id
            WHERE td2.task_id = t.id
            AND td2.dependency_type = 'blocks'
            AND t2.status != 'completed'
        );
    END IF;
    
    -- When a new blocking dependency is added
    IF TG_OP = 'INSERT' AND NEW.dependency_type = 'blocks' THEN
        -- Block the dependent task if dependency is not complete
        UPDATE tasks
        SET status = 'blocked'
        WHERE id = NEW.task_id
        AND status = 'queued'
        AND EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = NEW.depends_on_task_id
            AND t.status != 'completed'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dependency management
CREATE TRIGGER task_dependency_management
    AFTER INSERT OR UPDATE ON task_dependencies
    FOR EACH ROW EXECUTE FUNCTION manage_task_dependencies();

-- Also trigger when task status changes
CREATE TRIGGER task_status_dependency_check
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW EXECUTE FUNCTION manage_task_dependencies();

-- ============================================================================
-- TASK STATUS VALIDATION
-- ============================================================================

-- Function to validate task status transitions
CREATE OR REPLACE FUNCTION validate_task_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid transitions
    -- queued -> in_progress, cancelled
    -- in_progress -> blocked, review, completed, failed, cancelled
    -- blocked -> queued (if dependencies resolved), cancelled
    -- review -> completed, failed, in_progress
    -- completed -> (no transitions)
    -- failed -> queued, in_progress, cancelled
    -- cancelled -> queued
    
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Prevent changes to completed tasks
    IF OLD.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot modify a completed task';
    END IF;
    
    -- Validate transitions
    IF OLD.status = 'queued' AND NEW.status NOT IN ('in_progress', 'cancelled', 'blocked') THEN
        RAISE EXCEPTION 'Invalid status transition from queued to %', NEW.status;
    END IF;
    
    IF OLD.status = 'in_progress' AND NEW.status NOT IN ('blocked', 'review', 'completed', 'failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from in_progress to %', NEW.status;
    END IF;
    
    IF OLD.status = 'blocked' AND NEW.status NOT IN ('queued', 'cancelled', 'in_progress') THEN
        RAISE EXCEPTION 'Invalid status transition from blocked to %', NEW.status;
    END IF;
    
    IF OLD.status = 'review' AND NEW.status NOT IN ('completed', 'failed', 'in_progress') THEN
        RAISE EXCEPTION 'Invalid status transition from review to %', NEW.status;
    END IF;
    
    IF OLD.status = 'failed' AND NEW.status NOT IN ('queued', 'in_progress', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from failed to %', NEW.status;
    END IF;
    
    IF OLD.status = 'cancelled' AND NEW.status NOT IN ('queued') THEN
        RAISE EXCEPTION 'Invalid status transition from cancelled to %', NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status validation
CREATE TRIGGER task_status_validation
    BEFORE UPDATE OF status ON tasks
    FOR EACH ROW EXECUTE FUNCTION validate_task_status_transition();

-- ============================================================================
-- TASK AUTO-ASSIGNMENT
-- ============================================================================

-- Function to suggest an agent for a task based on capabilities and workload
CREATE OR REPLACE FUNCTION suggest_agent_for_task(p_task_id UUID)
RETURNS TABLE(agent_id UUID, agent_name VARCHAR, reason TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        format('Agent has matching capabilities and %s tasks in progress', 
            COALESCE((a.stats->>'tasks_in_progress')::int, 0))::TEXT as reason
    FROM tasks t
    CROSS JOIN agents a
    WHERE t.id = p_task_id
    AND a.tenant_id = t.tenant_id
    AND a.status IN ('idle', 'active')
    AND (
        -- Match task type to agent role/capabilities
        (t.type = 'generic' AND a.role IN ('worker', 'specialist'))
        OR (t.type ILIKE '%research%' AND a.role = 'specialist' AND 'access_external' = ANY(a.capabilities))
        OR (t.type ILIKE '%write%' AND a.role IN ('worker', 'specialist'))
        OR (t.type ILIKE '%code%' AND a.role = 'specialist')
    )
    ORDER BY 
        -- Prioritize agents with fewer active tasks
        COALESCE((a.stats->>'tasks_in_progress')::int, 0) ASC,
        -- Then by success rate
        COALESCE((a.stats->>'success_rate')::float, 1.0) DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TASK ACTIVITY ENHANCEMENT
-- ============================================================================

-- Enhance activity logging for tasks with more context
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_title VARCHAR(500);
    v_description TEXT;
    v_type activity_type;
    v_metadata JSONB;
BEGIN
    v_tenant_id := NEW.tenant_id;
    v_title := NEW.title;
    v_metadata := jsonb_build_object(
        'task_id', NEW.id,
        'priority', NEW.priority,
        'assignee_id', NEW.assignee_id
    );
    
    IF TG_OP = 'INSERT' THEN
        v_type := 'task.created';
        v_description := format('Task "%s" was created with %s priority', NEW.title, NEW.priority);
        v_metadata := v_metadata || jsonb_build_object('created_by', NEW.assigner_id);
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'queued' AND NEW.status = 'in_progress' THEN
            v_type := 'task.started';
            v_description := format('Task "%s" was started', NEW.title);
            v_metadata := v_metadata || jsonb_build_object('started_at', NEW.started_at);
            
        ELSIF NEW.status = 'completed' THEN
            v_type := 'task.completed';
            v_description := format('Task "%s" was completed', NEW.title);
            v_metadata := v_metadata || jsonb_build_object(
                'completed_at', NEW.completed_at,
                'duration_seconds', EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))
            );
            
        ELSIF NEW.status = 'failed' THEN
            v_type := 'task.failed';
            v_description := format('Task "%s" failed', NEW.title);
            
        ELSIF NEW.status = 'blocked' THEN
            v_type := 'task.blocked';
            v_description := format('Task "%s" is blocked by dependencies', NEW.title);
            
        ELSIF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
            v_type := 'task.assigned';
            v_description := format('Task "%s" was reassigned', NEW.title);
            v_metadata := v_metadata || jsonb_build_object(
                'previous_assignee', OLD.assignee_id,
                'new_assignee', NEW.assignee_id
            );
        END IF;
    END IF;
    
    -- Insert activity if we have a type
    IF v_type IS NOT NULL THEN
        INSERT INTO activities (
            tenant_id, type, category, actor_type, actor_id,
            target_type, target_id, title, description, metadata,
            agent_id, task_id
        ) VALUES (
            v_tenant_id, v_type, 'task', 
            CASE WHEN NEW.assignee_id IS NOT NULL THEN 'agent' ELSE 'user' END,
            COALESCE(NEW.assignee_id, NEW.assigner_id),
            'tasks', NEW.id,
            v_title, v_description, v_metadata,
            NEW.assignee_id, NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing task trigger and replace with enhanced version
DROP TRIGGER IF EXISTS tasks_activity_trigger ON tasks;
CREATE TRIGGER tasks_activity_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- ============================================================================
-- TASK STATISTICS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_statistics(p_tenant_id UUID)
RETURNS TABLE(
    status task_status,
    count BIGINT,
    avg_duration_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at)))::NUMERIC as avg_duration_seconds
    FROM tasks t
    WHERE t.tenant_id = p_tenant_id
    GROUP BY t.status
    ORDER BY 
        CASE t.status
            WHEN 'in_progress' THEN 1
            WHEN 'queued' THEN 2
            WHEN 'blocked' THEN 3
            WHEN 'review' THEN 4
            WHEN 'completed' THEN 5
            WHEN 'failed' THEN 6
            WHEN 'cancelled' THEN 7
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BULK TASK OPERATIONS
-- ============================================================================

-- Function to bulk update task status
CREATE OR REPLACE FUNCTION bulk_update_task_status(
    p_task_ids UUID[],
    p_new_status task_status,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE tasks
    SET 
        status = p_new_status,
        started_at = CASE WHEN p_new_status = 'in_progress' AND status = 'queued' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status IN ('completed', 'failed', 'cancelled') AND status NOT IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
    WHERE id = ANY(p_task_ids)
    AND tenant_id = p_tenant_id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TASK SEARCH ENHANCEMENT
-- ============================================================================

-- Function to search tasks with advanced filtering
CREATE OR REPLACE FUNCTION search_tasks(
    p_tenant_id UUID,
    p_query TEXT DEFAULT NULL,
    p_status task_status[] DEFAULT NULL,
    p_priority task_priority[] DEFAULT NULL,
    p_assignee_id UUID DEFAULT NULL,
    p_has_dependencies BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    status task_status,
    priority task_priority,
    assignee_id UUID,
    created_at TIMESTAMPTZ,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.status,
        t.priority,
        t.assignee_id,
        t.created_at,
        ts_rank(t.search_vector, plainto_tsquery('english', p_query))::REAL as rank
    FROM tasks t
    WHERE t.tenant_id = p_tenant_id
    AND (
        p_query IS NULL 
        OR t.search_vector @@ plainto_tsquery('english', p_query)
    )
    AND (p_status IS NULL OR t.status = ANY(p_status))
    AND (p_priority IS NULL OR t.priority = ANY(p_priority))
    AND (p_assignee_id IS NULL OR t.assignee_id = p_assignee_id)
    AND (
        p_has_dependencies IS NULL 
        OR (p_has_dependencies AND EXISTS (SELECT 1 FROM task_dependencies td WHERE td.task_id = t.id))
        OR (NOT p_has_dependencies AND NOT EXISTS (SELECT 1 FROM task_dependencies td WHERE td.task_id = t.id))
    )
    ORDER BY 
        CASE WHEN p_query IS NOT NULL THEN ts_rank(t.search_vector, plainto_tsquery('english', p_query)) END DESC NULLS LAST,
        t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

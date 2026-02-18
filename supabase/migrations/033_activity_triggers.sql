-- Migration: 033_activity_triggers
-- Description: Database triggers for automatic activity logging on tasks, decisions, and escalations
-- Creates enhanced trigger functions that log activities with specific types:
--   - task.created, task.status_changed
--   - decision.created, decision.resolved
--   - escalation.created, escalation.resolved

-- ============================================================================
-- ACTIVITY TYPE EXTENSIONS
-- ============================================================================

-- Add new activity types to the enum if they don't exist
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in transactions for some versions
-- These types should already exist from migration 001, but we verify here

DO $$
BEGIN
    -- Check if our required activity types exist in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'activity_type'::regtype 
        AND enumlabel = 'task.created'
    ) THEN
        -- The enum values should already exist from 001_initial_schema.sql
        -- If not, raise a notice
        RAISE NOTICE 'Activity types may be missing. Expected: task.created, task.status_changed, etc.';
    END IF;
END$$;

-- ============================================================================
-- ENHANCED ACTIVITY LOGGING TRIGGER FUNCTION
-- ============================================================================

-- Drop existing triggers that we'll recreate
DROP TRIGGER IF EXISTS tasks_activity_trigger ON tasks;
DROP TRIGGER IF EXISTS decisions_activity_trigger ON decisions;
DROP TRIGGER IF EXISTS escalations_activity_trigger ON escalations;

-- Create enhanced activity logging function with specific activity types
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
                -- Status change - log as status_changed for any status transition
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    v_type := 'task.status_changed';
                    v_title := format('Task %s', NEW.status);
                    v_description := format('Task "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status);
                    v_metadata := jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'progress_percent', NEW.progress_percent
                    );
                    
                    -- Add specific metadata for completed tasks
                    IF NEW.status = 'completed' THEN
                        v_metadata := v_metadata || jsonb_build_object(
                            'duration_seconds', EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
                            'cost_usd', NEW.cost_usd,
                            'tokens_used', NEW.tokens_used
                        );
                    END IF;
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
                -- Status change - log status changes with specific type
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    IF NEW.status = 'approved' THEN
                        v_type := 'decision.made';
                        v_title := 'Decision approved';
                        v_description := format('Decision "%s" was approved', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'decided_at', NEW.decided_at,
                            'category', NEW.category
                        );
                    ELSIF NEW.status = 'rejected' THEN
                        v_type := 'decision.made';
                        v_title := 'Decision rejected';
                        v_description := format('Decision "%s" was rejected', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'decided_at', NEW.decided_at
                        );
                    ELSIF NEW.status = 'overridden' THEN
                        v_type := 'decision.overridden';
                        v_title := 'Decision overridden';
                        v_description := format('Decision "%s" was overridden by human', NEW.title);
                        v_metadata := jsonb_build_object(
                            'overridden_by', NEW.overridden_by,
                            'override_reason', NEW.override_reason,
                            'overridden_at', NEW.overridden_at
                        );
                    ELSIF NEW.status = 'executed' THEN
                        v_type := 'decision.made';
                        v_title := 'Decision executed';
                        v_description := format('Decision "%s" was executed', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'executed_at', NEW.executed_at,
                            'outcome', NEW.outcome
                        );
                    ELSE
                        -- Generic status change
                        v_type := 'decision.made';
                        v_title := format('Decision %s', NEW.status);
                        v_description := format('Decision "%s" status changed to %s', NEW.title, NEW.status);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status
                        );
                    END IF;
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
            ELSIF TG_OP = 'UPDATE' THEN
                -- Status change - specifically handle resolved status
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    IF NEW.status = 'resolved' THEN
                        v_type := 'escalation.resolved';
                        v_title := 'Escalation resolved';
                        v_description := format('Escalation "%s" was resolved', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'resolved_by', NEW.resolved_by,
                            'resolution_type', NEW.resolution_type,
                            'time_to_resolve_seconds', NEW.time_to_resolve_seconds
                        );
                    ELSIF NEW.status = 'dismissed' THEN
                        v_type := 'escalation.resolved';
                        v_title := 'Escalation dismissed';
                        v_description := format('Escalation "%s" was dismissed', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'resolved_by', NEW.resolved_by
                        );
                    ELSE
                        -- Other status changes (e.g., open -> in_progress)
                        v_type := 'escalation.resolved';
                        v_title := format('Escalation %s', NEW.status);
                        v_description := format('Escalation "%s" status changed to %s', NEW.title, NEW.status);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status
                        );
                    END IF;
                ELSE
                    -- Don't log other escalation updates
                    RETURN NEW;
                END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGERS FOR ACTIVITY LOGGING
-- ============================================================================

-- Trigger on tasks table: INSERT (created), UPDATE status (status_changed)
CREATE TRIGGER tasks_activity_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Trigger on decisions table: INSERT (created), UPDATE status (resolved)
CREATE TRIGGER decisions_activity_trigger
    AFTER INSERT OR UPDATE ON decisions
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Trigger on escalations table: INSERT (created), UPDATE status (resolved)
CREATE TRIGGER escalations_activity_trigger
    AFTER INSERT OR UPDATE ON escalations
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Agent trigger (keep existing functionality)
CREATE TRIGGER agents_activity_trigger
    AFTER INSERT OR UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- ============================================================================
-- REALTIME CONFIGURATION
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

-- Ensure tasks table is in realtime publication for status change broadcasts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'tasks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
    END IF;
END$$;

-- Ensure decisions table is in realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'decisions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
    END IF;
END$$;

-- Ensure escalations table is in realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'escalations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE escalations;
    END IF;
END$$;

-- ============================================================================
-- REALTIME BROADCAST FUNCTION
-- ============================================================================

-- Create function to broadcast activity events with enhanced payload
CREATE OR REPLACE FUNCTION broadcast_activity_event()
RETURNS TRIGGER AS $$
BEGIN
    -- The actual broadcast happens via Supabase Realtime publication
    -- This function can be extended to add custom payload formatting
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for realtime broadcast on activities
DROP TRIGGER IF EXISTS activities_realtime_broadcast ON activities;
CREATE TRIGGER activities_realtime_broadcast
    AFTER INSERT ON activities
    FOR EACH ROW EXECUTE FUNCTION broadcast_activity_event();

-- ============================================================================
-- RLS POLICY VERIFICATION
-- ============================================================================

-- Ensure activities table has RLS enabled
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS activities_select_tenant ON activities;
DROP POLICY IF EXISTS activities_insert_tenant ON activities;
DROP POLICY IF EXISTS activities_service_bypass ON activities;

-- Allow users to view activities for their tenant
CREATE POLICY activities_select_tenant ON activities
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Allow inserts (trigger function runs as SECURITY DEFINER, but direct inserts need policy)
CREATE POLICY activities_insert_tenant ON activities
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Service role can bypass RLS for all operations
CREATE POLICY activities_service_bypass ON activities
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION FOR TESTING
-- ============================================================================

-- Function to get recent activities with full details
CREATE OR REPLACE FUNCTION get_recent_activities(
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    type activity_type,
    category VARCHAR,
    title VARCHAR,
    description TEXT,
    actor_type VARCHAR,
    actor_id UUID,
    target_type VARCHAR,
    target_id UUID,
    agent_id UUID,
    task_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    sequence_number BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.type,
        a.category,
        a.title,
        a.description,
        a.actor_type,
        a.actor_id,
        a.target_type,
        a.target_id,
        a.agent_id,
        a.task_id,
        a.metadata,
        a.created_at,
        a.sequence_number
    FROM activities a
    WHERE a.tenant_id = p_tenant_id
    ORDER BY a.sequence_number DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MESSAGE ACTIVITY TRIGGERS
-- ============================================================================

-- Add message triggers for activity logging
DROP TRIGGER IF EXISTS messages_activity_trigger ON messages;

-- Update the log_activity function to handle messages
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
                -- Status change - log as status_changed for any status transition
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    v_type := 'task.status_changed';
                    v_title := format('Task %s', NEW.status);
                    v_description := format('Task "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status);
                    v_metadata := jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'progress_percent', NEW.progress_percent
                    );
                    
                    -- Add specific metadata for completed tasks
                    IF NEW.status = 'completed' THEN
                        v_metadata := v_metadata || jsonb_build_object(
                            'duration_seconds', EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
                            'cost_usd', NEW.cost_usd,
                            'tokens_used', NEW.tokens_used
                        );
                    END IF;
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
                -- Status change - log status changes with specific type
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    IF NEW.status = 'approved' THEN
                        v_type := 'decision.made';
                        v_title := 'Decision approved';
                        v_description := format('Decision "%s" was approved', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'decided_at', NEW.decided_at,
                            'category', NEW.category
                        );
                    ELSIF NEW.status = 'rejected' THEN
                        v_type := 'decision.made';
                        v_title := 'Decision rejected';
                        v_description := format('Decision "%s" was rejected', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'decided_at', NEW.decided_at
                        );
                    ELSIF NEW.status = 'overridden' THEN
                        v_type := 'decision.overridden';
                        v_title := 'Decision overridden';
                        v_description := format('Decision "%s" was overridden by human', NEW.title);
                        v_metadata := jsonb_build_object(
                            'overridden_by', NEW.overridden_by,
                            'override_reason', NEW.override_reason,
                            'overridden_at', NEW.overridden_at
                        );
                    ELSIF NEW.status = 'executed' THEN
                        v_type := 'decision.made';
                        v_title := 'Decision executed';
                        v_description := format('Decision "%s" was executed', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'executed_at', NEW.executed_at,
                            'outcome', NEW.outcome
                        );
                    ELSE
                        -- Generic status change
                        v_type := 'decision.made';
                        v_title := format('Decision %s', NEW.status);
                        v_description := format('Decision "%s" status changed to %s', NEW.title, NEW.status);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status
                        );
                    END IF;
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
            ELSIF TG_OP = 'UPDATE' THEN
                -- Status change - specifically handle resolved status
                IF OLD.status IS DISTINCT FROM NEW.status THEN
                    IF NEW.status = 'resolved' THEN
                        v_type := 'escalation.resolved';
                        v_title := 'Escalation resolved';
                        v_description := format('Escalation "%s" was resolved', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'resolved_by', NEW.resolved_by,
                            'resolution_type', NEW.resolution_type,
                            'time_to_resolve_seconds', NEW.time_to_resolve_seconds
                        );
                    ELSIF NEW.status = 'dismissed' THEN
                        v_type := 'escalation.resolved';
                        v_title := 'Escalation dismissed';
                        v_description := format('Escalation "%s" was dismissed', NEW.title);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status,
                            'resolved_by', NEW.resolved_by
                        );
                    ELSE
                        -- Other status changes (e.g., open -> in_progress)
                        v_type := 'escalation.resolved';
                        v_title := format('Escalation %s', NEW.status);
                        v_description := format('Escalation "%s" status changed to %s', NEW.title, NEW.status);
                        v_metadata := jsonb_build_object(
                            'previous_status', OLD.status,
                            'new_status', NEW.status
                        );
                    END IF;
                ELSE
                    -- Don't log other escalation updates
                    RETURN NEW;
                END IF;
            END IF;

        WHEN 'messages' THEN
            v_tenant_id := NEW.tenant_id;
            v_actor_id := NEW.from_agent_id;
            v_actor_type := CASE WHEN NEW.from_agent_id IS NOT NULL THEN 'agent' ELSE 'user' END;
            v_agent_id := NEW.from_agent_id;
            v_category := 'message';
            
            IF TG_OP = 'INSERT' THEN
                -- Determine if message is sent or received from agent perspective
                IF NEW.from_agent_id IS NOT NULL THEN
                    v_type := 'message.sent';
                    v_title := 'Message sent';
                    v_description := format('Agent sent a %s message', NEW.message_type);
                ELSE
                    v_type := 'message.received';
                    v_title := 'Message received';
                    v_description := format('Agent received a %s message', NEW.message_type);
                    v_agent_id := NEW.to_agent_id;
                    v_actor_id := NEW.to_agent_id;
                END IF;
                
                v_metadata := jsonb_build_object(
                    'message_type', NEW.message_type,
                    'from_agent_id', NEW.from_agent_id,
                    'to_agent_id', NEW.to_agent_id,
                    'to_broadcast', NEW.to_broadcast,
                    'priority', NEW.priority,
                    'thread_id', NEW.thread_id
                );
            ELSE
                -- Don't log message updates
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for messages
CREATE TRIGGER messages_activity_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Ensure messages table is in realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION log_activity() IS 'Enhanced trigger function for logging activities. Logs task.created/task.status_changed, decision.proposed/decision.*, escalation.created/escalation.resolved, message.sent/message.received';
COMMENT ON FUNCTION broadcast_activity_event() IS 'Trigger function for realtime activity broadcasts';
COMMENT ON FUNCTION get_recent_activities(UUID, INTEGER) IS 'Returns recent activities for a tenant with full details';
COMMENT ON TRIGGER messages_activity_trigger ON messages IS 'Trigger to log message activities';

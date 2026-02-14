-- Migration: 018_agent_version_history_enhancement
-- Description: Enhanced version history tracking for agent configuration changes

-- ============================================================================
-- AGENT VERSION HISTORY TABLE (Complete agent state snapshots)
-- ============================================================================

CREATE TABLE agent_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Version info
    version_number INTEGER NOT NULL,
    name VARCHAR(255), -- e.g., "Initial setup", "Added capabilities"
    description TEXT,
    
    -- Complete agent snapshot at this version
    agent_data JSONB NOT NULL,
    -- Includes: name, role, description, status, capabilities, llm_config, limits, config
    
    -- Change metadata
    change_type VARCHAR(50) NOT NULL DEFAULT 'manual' 
        CHECK (change_type IN ('manual', 'auto_save', 'restore', 'template_import', 'clone', 'system')),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_summary JSONB DEFAULT '{}'::jsonb, -- structured diff from previous version
    
    -- Source of change
    change_source VARCHAR(50) DEFAULT 'api' 
        CHECK (change_source IN ('api', 'ui', 'system', 'migration', 'restore')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, agent_id, version_number)
);

CREATE INDEX idx_agent_version_history_tenant ON agent_version_history(tenant_id);
CREATE INDEX idx_agent_version_history_agent ON agent_version_history(agent_id);
CREATE INDEX idx_agent_version_history_created ON agent_version_history(tenant_id, created_at DESC);

COMMENT ON TABLE agent_version_history IS 'Complete version history for agent state changes (not just config)';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE agent_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_version_history_tenant_isolation ON agent_version_history
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- VERSION NUMBER GENERATOR
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_agent_version(p_agent_id UUID, p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM agent_version_history
    WHERE agent_id = p_agent_id AND tenant_id = p_tenant_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Track Agent Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION track_agent_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
    change_summary JSONB;
    changed_fields TEXT[];
    field_name TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- Only track if meaningful fields changed
    -- Skip changes to: session_id, current_task_id, stats, updated_at
    -- Track changes to: name, role, description, status, capabilities, llm_config, limits, config
    
    -- Check if any tracked fields changed
    IF (
        OLD.name IS NOT DISTINCT FROM NEW.name AND
        OLD.role IS NOT DISTINCT FROM NEW.role AND
        OLD.description IS NOT DISTINCT FROM NEW.description AND
        OLD.status IS NOT DISTINCT FROM NEW.status AND
        OLD.capabilities IS NOT DISTINCT FROM NEW.capabilities AND
        OLD.llm_config IS NOT DISTINCT FROM NEW.llm_config AND
        OLD.limits IS NOT DISTINCT FROM NEW.limits AND
        OLD.config IS NOT DISTINCT FROM NEW.config
    ) THEN
        -- No meaningful changes, skip version creation
        RETURN NEW;
    END IF;
    
    -- Calculate next version number
    next_version := get_next_agent_version(NEW.id, NEW.tenant_id);
    
    -- Build change summary
    change_summary := jsonb_build_object('previous_version', next_version - 1);
    changed_fields := ARRAY[]::TEXT[];
    
    IF OLD.name IS DISTINCT FROM NEW.name THEN
        changed_fields := array_append(changed_fields, 'name');
    END IF;
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        changed_fields := array_append(changed_fields, 'role');
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
        changed_fields := array_append(changed_fields, 'description');
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        changed_fields := array_append(changed_fields, 'status');
    END IF;
    IF OLD.capabilities IS DISTINCT FROM NEW.capabilities THEN
        changed_fields := array_append(changed_fields, 'capabilities');
    END IF;
    IF OLD.llm_config IS DISTINCT FROM NEW.llm_config THEN
        changed_fields := array_append(changed_fields, 'llm_config');
    END IF;
    IF OLD.limits IS DISTINCT FROM NEW.limits THEN
        changed_fields := array_append(changed_fields, 'limits');
    END IF;
    IF OLD.config IS DISTINCT FROM NEW.config THEN
        changed_fields := array_append(changed_fields, 'config');
    END IF;
    
    change_summary := jsonb_build_object(
        'previous_version', next_version - 1,
        'changed_fields', changed_fields
    );
    
    -- Insert version record
    INSERT INTO agent_version_history (
        tenant_id,
        agent_id,
        version_number,
        agent_data,
        change_type,
        change_summary,
        change_source
    ) VALUES (
        NEW.tenant_id,
        NEW.id,
        next_version,
        jsonb_build_object(
            'name', NEW.name,
            'role', NEW.role,
            'description', NEW.description,
            'status', NEW.status,
            'capabilities', NEW.capabilities,
            'llm_config', NEW.llm_config,
            'limits', NEW.limits,
            'config', NEW.config,
            'parent_id', NEW.parent_id,
            'depth', NEW.depth
        ),
        'manual',
        change_summary,
        'api'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track agent changes
CREATE TRIGGER agent_version_tracking_trigger
    AFTER UPDATE OF name, role, description, status, capabilities, llm_config, limits, config ON agents
    FOR EACH ROW
    EXECUTE FUNCTION track_agent_version();

-- Also track inserts (initial version)
CREATE OR REPLACE FUNCTION track_agent_initial_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO agent_version_history (
        tenant_id,
        agent_id,
        version_number,
        name,
        description,
        agent_data,
        change_type,
        change_summary,
        change_source
    ) VALUES (
        NEW.tenant_id,
        NEW.id,
        1,
        'Initial version',
        'Agent created with initial configuration',
        jsonb_build_object(
            'name', NEW.name,
            'role', NEW.role,
            'description', NEW.description,
            'status', NEW.status,
            'capabilities', NEW.capabilities,
            'llm_config', NEW.llm_config,
            'limits', NEW.limits,
            'config', NEW.config,
            'parent_id', NEW.parent_id,
            'depth', NEW.depth
        ),
        'manual',
        jsonb_build_object('is_initial', true),
        'system'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_initial_version_trigger
    AFTER INSERT ON agents
    FOR EACH ROW
    EXECUTE FUNCTION track_agent_initial_version();

-- ============================================================================
-- FUNCTION: Restore Agent to Version
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_agent_to_version(
    p_agent_id UUID,
    p_version_number INTEGER,
    p_tenant_id UUID,
    p_changed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_version_record RECORD;
    v_current_version INTEGER;
    v_new_version INTEGER;
    v_result JSONB;
BEGIN
    -- Get the version to restore
    SELECT * INTO v_version_record
    FROM agent_version_history
    WHERE agent_id = p_agent_id 
      AND version_number = p_version_number 
      AND tenant_id = p_tenant_id;
    
    IF v_version_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Version not found',
            'message', format('No version %s found for agent %s', p_version_number, p_agent_id)
        );
    END IF;
    
    -- Get current version number
    SELECT COALESCE(MAX(version_number), 0) INTO v_current_version
    FROM agent_version_history
    WHERE agent_id = p_agent_id AND tenant_id = p_tenant_id;
    
    IF v_current_version = p_version_number THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already at version',
            'message', format('Agent is already at version %s', p_version_number)
        );
    END IF;
    
    -- Update agent with version data
    UPDATE agents
    SET 
        name = v_version_record.agent_data->>'name',
        role = (v_version_record.agent_data->>'role')::agent_role,
        description = v_version_record.agent_data->>'description',
        capabilities = ARRAY(SELECT jsonb_array_elements_text(v_version_record.agent_data->'capabilities')),
        llm_config = v_version_record.agent_data->'llm_config',
        limits = v_version_record.agent_data->'limits',
        config = v_version_record.agent_data->'config',
        updated_at = NOW()
    WHERE id = p_agent_id AND tenant_id = p_tenant_id;
    
    -- The update trigger will create the new version record
    -- But we need to update it with restore metadata
    SELECT version_number INTO v_new_version
    FROM agent_version_history
    WHERE agent_id = p_agent_id AND tenant_id = p_tenant_id
    ORDER BY version_number DESC
    LIMIT 1;
    
    UPDATE agent_version_history
    SET 
        name = format('Restored from v%s', p_version_number),
        description = format('Restored to version %s%s', 
            p_version_number,
            CASE WHEN v_version_record.name IS NOT NULL 
                 THEN format(' "%s"', v_version_record.name) 
                 ELSE '' 
            END
        ),
        change_type = 'restore',
        changed_by = p_changed_by,
        change_summary = jsonb_build_object(
            'restored_from_version', p_version_number,
            'restored_from_version_id', v_version_record.id,
            'previous_version', v_current_version
        )
    WHERE agent_id = p_agent_id 
      AND version_number = v_new_version 
      AND tenant_id = p_tenant_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Agent restored to version %s', p_version_number),
        'data', jsonb_build_object(
            'agent_id', p_agent_id,
            'restored_from_version', p_version_number,
            'current_version', v_new_version,
            'previous_version', v_current_version
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get Version History with Diff
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agent_version_history(
    p_agent_id UUID,
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    name VARCHAR,
    description TEXT,
    change_type VARCHAR,
    change_source VARCHAR,
    changed_by UUID,
    changed_by_name VARCHAR,
    created_at TIMESTAMPTZ,
    is_current BOOLEAN,
    change_summary JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH current_version AS (
        SELECT COALESCE(MAX(version_number), 0) as max_version
        FROM agent_version_history
        WHERE agent_id = p_agent_id AND tenant_id = p_tenant_id
    )
    SELECT 
        vh.id,
        vh.version_number,
        vh.name,
        vh.description,
        vh.change_type,
        vh.change_source,
        vh.changed_by,
        u.name as changed_by_name,
        vh.created_at,
        vh.version_number = cv.max_version as is_current,
        vh.change_summary
    FROM agent_version_history vh
    LEFT JOIN users u ON u.id = vh.changed_by
    CROSS JOIN current_version cv
    WHERE vh.agent_id = p_agent_id 
      AND vh.tenant_id = p_tenant_id
    ORDER BY vh.version_number DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON agent_version_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_agent_version(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_agent_to_version(UUID, INTEGER, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_version_history(UUID, UUID, INTEGER, INTEGER) TO authenticated;

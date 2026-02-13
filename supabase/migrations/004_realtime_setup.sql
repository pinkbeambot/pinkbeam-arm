-- Migration: 004_realtime_setup
-- Description: Configure Supabase Realtime for WebSocket subscriptions

-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================

-- Create publication for realtime if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END$$;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE escalations;
ALTER PUBLICATION supabase_realtime ADD TABLE decisions;

-- ============================================================================
-- REALTIME BROADCAST CHANNELS
-- ============================================================================

-- Note: Broadcast channels are created dynamically by the application
-- These are the channel naming conventions:
--
-- tenant:{tenant_id}           - All activity for a tenant
-- tenant:{tenant_id}:agents    - Agent status changes
-- tenant:{tenant_id}:tasks     - Task updates
-- tenant:{tenant_id}:messages  - Agent messages
-- agent:{agent_id}             - Direct agent messages
--
-- Example subscription in client:
-- const channel = supabase.channel('tenant:123e4567-...')
--   .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, callback)
--   .subscribe()

-- ============================================================================
-- REALTIME HELPER FUNCTIONS
-- ============================================================================

-- Function to broadcast activity events
CREATE OR REPLACE FUNCTION broadcast_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- The actual broadcast happens via Supabase Realtime
    -- This trigger ensures the event is captured for the publication
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure all activity inserts trigger a realtime event
CREATE TRIGGER activities_realtime_broadcast
    AFTER INSERT ON activities
    FOR EACH ROW EXECUTE FUNCTION broadcast_activity();

-- ============================================================================
-- PRESENCE TRACKING (for online status)
-- ============================================================================

CREATE TABLE agent_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Presence info
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    client_info JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(tenant_id, agent_id)
);

CREATE INDEX idx_agent_presence_tenant ON agent_presence(tenant_id);
CREATE INDEX idx_agent_presence_agent ON agent_presence(agent_id);
CREATE INDEX idx_agent_presence_status ON agent_presence(tenant_id, status);

-- RLS for presence
ALTER TABLE agent_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_presence_tenant_isolation ON agent_presence
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Function to update presence
CREATE OR REPLACE FUNCTION update_agent_presence(p_agent_id UUID, p_status VARCHAR)
RETURNS void AS $$
BEGIN
    INSERT INTO agent_presence (tenant_id, agent_id, status, last_seen_at)
    SELECT tenant_id, id, p_status, NOW()
    FROM agents
    WHERE id = p_agent_id
    ON CONFLICT (tenant_id, agent_id) 
    DO UPDATE SET 
        status = p_status,
        last_seen_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Add presence to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE agent_presence;

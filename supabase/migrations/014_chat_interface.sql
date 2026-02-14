-- Migration: Add chat interface tables for CEO-Agent conversations
-- Issue: #48 - Chat Interface

-- ============================================================================
-- CHATS (One chat per user-agent pair)
-- ============================================================================

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Metadata
    title TEXT, -- Optional custom title for the chat
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one chat per user-agent pair per tenant
    UNIQUE(tenant_id, user_id, agent_id)
);

CREATE INDEX idx_chats_tenant ON chats(tenant_id);
CREATE INDEX idx_chats_user ON chats(user_id);
CREATE INDEX idx_chats_agent ON chats(agent_id);
CREATE INDEX idx_chats_updated ON chats(updated_at DESC);

COMMENT ON TABLE chats IS 'Chat sessions between users and agents';

-- ============================================================================
-- CHAT MESSAGES
-- ============================================================================

CREATE TYPE chat_message_role AS ENUM ('user', 'agent', 'system');

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role chat_message_role NOT NULL,
    content TEXT NOT NULL,
    
    -- Metadata for future actions and context
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Structure: {
    --   intent?: 'query' | 'action' | 'clarification',
    --   context_refs?: { tasks?: string[], decisions?: string[], escalations?: string[] },
    --   action_result?: { success: boolean, action: string, data?: any }
    -- }
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at DESC);

COMMENT ON TABLE chat_messages IS 'Individual messages within a chat';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chats policies
CREATE POLICY "Users can view their own chats" ON chats
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can create chats" ON chats
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own chats" ON chats
    FOR UPDATE USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can delete their own chats" ON chats
    FOR DELETE USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = auth.uid()
    );

-- Chat messages policies
CREATE POLICY "Users can view messages from their chats" ON chat_messages
    FOR SELECT USING (
        chat_id IN (
            SELECT id FROM chats 
            WHERE tenant_id = current_setting('app.current_tenant')::UUID
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their chats" ON chat_messages
    FOR INSERT WITH CHECK (
        chat_id IN (
            SELECT id FROM chats 
            WHERE tenant_id = current_setting('app.current_tenant')::UUID
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (
        role = 'user'
        AND chat_id IN (
            SELECT id FROM chats 
            WHERE tenant_id = current_setting('app.current_tenant')::UUID
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own messages" ON chat_messages
    FOR DELETE USING (
        role = 'user'
        AND chat_id IN (
            SELECT id FROM chats 
            WHERE tenant_id = current_setting('app.current_tenant')::UUID
            AND user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on chats when new message is added
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats 
    SET updated_at = NOW() 
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_message_update_chat_timestamp
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_timestamp();

-- Update updated_at on message edit
CREATE OR REPLACE FUNCTION update_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_update_timestamp
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_timestamp();

-- ============================================================================
-- REALTIME SETUP
-- ============================================================================

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get or create chat between user and agent
CREATE OR REPLACE FUNCTION get_or_create_chat(
    p_tenant_id UUID,
    p_user_id UUID,
    p_agent_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_chat_id UUID;
BEGIN
    -- Try to find existing chat
    SELECT id INTO v_chat_id
    FROM chats
    WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
    AND agent_id = p_agent_id;
    
    -- If not found, create new chat
    IF v_chat_id IS NULL THEN
        INSERT INTO chats (tenant_id, user_id, agent_id)
        VALUES (p_tenant_id, p_user_id, p_agent_id)
        RETURNING id INTO v_chat_id;
    END IF;
    
    RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get chat messages with agent info
CREATE OR REPLACE FUNCTION get_chat_messages(
    p_chat_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    chat_id UUID,
    role chat_message_role,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    agent_name TEXT,
    agent_avatar TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.chat_id,
        cm.role,
        cm.content,
        cm.metadata,
        cm.created_at,
        a.name as agent_name,
        a.avatar_url as agent_avatar
    FROM chat_messages cm
    JOIN chats c ON cm.chat_id = c.id
    LEFT JOIN agents a ON c.agent_id = a.id
    WHERE cm.chat_id = p_chat_id
    AND (p_before IS NULL OR cm.created_at < p_before)
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's chats with last message preview
CREATE OR REPLACE FUNCTION get_user_chats(
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    agent_id UUID,
    agent_name TEXT,
    agent_avatar TEXT,
    agent_role TEXT,
    agent_status TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        a.id as agent_id,
        a.name as agent_name,
        a.avatar_url as agent_avatar,
        a.role::TEXT as agent_role,
        a.status::TEXT as agent_status,
        (
            SELECT cm.content 
            FROM chat_messages cm 
            WHERE cm.chat_id = c.id 
            ORDER BY cm.created_at DESC 
            LIMIT 1
        ) as last_message,
        (
            SELECT cm.created_at 
            FROM chat_messages cm 
            WHERE cm.chat_id = c.id 
            ORDER BY cm.created_at DESC 
            LIMIT 1
        ) as last_message_at,
        (
            SELECT COUNT(*) 
            FROM chat_messages cm 
            WHERE cm.chat_id = c.id 
            AND cm.role = 'agent'
            AND cm.created_at > COALESCE(
                (SELECT MAX(created_at) FROM chat_messages WHERE chat_id = c.id AND role = 'user'),
                '1970-01-01'::TIMESTAMPTZ
            )
        ) as unread_count,
        c.created_at,
        c.updated_at
    FROM chats c
    JOIN agents a ON c.agent_id = a.id
    WHERE c.tenant_id = p_tenant_id
    AND c.user_id = p_user_id
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

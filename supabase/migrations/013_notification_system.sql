-- Migration: 012_notification_system
-- Description: Add notifications table for user notification system

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_label VARCHAR(100),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT valid_entity_type CHECK (
        related_entity_type IS NULL OR 
        related_entity_type IN ('agent', 'task', 'escalation', 'decision', 'system')
    )
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications(tenant_id, user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(related_entity_type, related_entity_id) WHERE related_entity_type IS NOT NULL;

COMMENT ON TABLE notifications IS 'User notifications with real-time delivery support';

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_tenant_view ON notifications
    FOR SELECT
    USING (
        tenant_id = current_setting('app.current_tenant')::UUID 
        AND (user_id IS NULL OR user_id = current_setting('app.current_user_id')::UUID)
    );

CREATE POLICY notifications_user_update ON notifications
    FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND (user_id IS NULL OR user_id = current_setting('app.current_user_id')::UUID)
    );

CREATE POLICY notifications_service_insert ON notifications
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_affected INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id
      AND tenant_id = current_setting('app.current_tenant')::UUID
      AND (user_id IS NULL OR user_id = current_setting('app.current_user_id')::UUID)
      AND is_read = false;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN v_affected > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE tenant_id = current_setting('app.current_tenant')::UUID
      AND (user_id IS NULL OR user_id = current_setting('app.current_user_id')::UUID)
      AND is_read = false;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_notification(
    p_tenant_id UUID, p_user_id UUID, p_type notification_type,
    p_title VARCHAR, p_message TEXT, p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR DEFAULT NULL, p_related_entity_type VARCHAR DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE v_notification_id UUID;
BEGIN
    INSERT INTO notifications (tenant_id, user_id, type, title, message, action_url, action_label, related_entity_type, related_entity_id, metadata)
    VALUES (p_tenant_id, p_user_id, p_type, p_title, p_message, p_action_url, p_action_label, p_related_entity_type, p_related_entity_id, p_metadata)
    RETURNING id INTO v_notification_id;
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM notifications
    WHERE tenant_id = current_setting('app.current_tenant')::UUID
      AND is_read = false
      AND (user_id IS NULL OR user_id = COALESCE(p_user_id, current_setting('app.current_user_id')::UUID))
      AND (expires_at IS NULL OR expires_at > NOW());
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

CREATE OR REPLACE FUNCTION notify_on_escalation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_notification(
        NEW.tenant_id, NULL,
        CASE WHEN NEW.urgency = 'critical' THEN 'error'::notification_type
             WHEN NEW.urgency = 'high' THEN 'warning'::notification_type
             ELSE 'info'::notification_type END,
        'New Escalation: ' || NEW.title,
        COALESCE(NEW.description, 'An agent has raised an escalation requiring attention.'),
        '/portal/escalations/' || NEW.id, 'View Escalation', 'escalation', NEW.id,
        jsonb_build_object('urgency', NEW.urgency, 'type', NEW.type, 'agent_id', NEW.agent_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escalation_notification_trigger
    AFTER INSERT ON escalations
    FOR EACH ROW WHEN (NEW.status = 'open')
    EXECUTE FUNCTION notify_on_escalation();

CREATE OR REPLACE FUNCTION notify_on_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        PERFORM create_notification(NEW.tenant_id, NULL, 'error'::notification_type,
            'Task Failed: ' || NEW.title, 'A task has failed and may require attention.',
            '/portal/tasks/' || NEW.id, 'View Task', 'task', NEW.id,
            jsonb_build_object('status', NEW.status, 'previous_status', OLD.status));
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM create_notification(NEW.tenant_id, NULL, 'success'::notification_type,
            'Task Completed: ' || NEW.title, 'A task has been completed successfully.',
            '/portal/tasks/' || NEW.id, 'View Task', 'task', NEW.id,
            jsonb_build_object('status', NEW.status));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_status_notification_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_on_task_status_change();

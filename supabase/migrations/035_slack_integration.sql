-- Migration: 035_slack_integration
-- Description: Add Slack webhook integration tables and triggers

-- ============================================================================
-- SLACK WEBHOOKS TABLE
-- ============================================================================

CREATE TABLE slack_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    channel VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_tested_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

CREATE INDEX idx_slack_webhooks_tenant ON slack_webhooks(tenant_id);
CREATE INDEX idx_slack_webhooks_active ON slack_webhooks(tenant_id, is_active);

COMMENT ON TABLE slack_webhooks IS 'Slack webhook configuration per tenant';
COMMENT ON COLUMN slack_webhooks.webhook_url IS 'Slack incoming webhook URL';
COMMENT ON COLUMN slack_webhooks.channel IS 'Optional channel override (e.g., #notifications)';
COMMENT ON COLUMN slack_webhooks.consecutive_failures IS 'Number of consecutive delivery failures';

ALTER TABLE slack_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY slack_webhooks_tenant_select ON slack_webhooks
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY slack_webhooks_tenant_insert ON slack_webhooks
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY slack_webhooks_tenant_update ON slack_webhooks
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY slack_webhooks_tenant_delete ON slack_webhooks
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- SLACK DELIVERY LOG TABLE
-- ============================================================================

CREATE TABLE slack_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_id UUID REFERENCES slack_webhooks(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'delivered', 'failed', 'rate_limited'))
);

CREATE INDEX idx_slack_delivery_tenant ON slack_delivery_log(tenant_id);
CREATE INDEX idx_slack_delivery_webhook ON slack_delivery_log(webhook_id);
CREATE INDEX idx_slack_delivery_status ON slack_delivery_log(status);
CREATE INDEX idx_slack_delivery_created ON slack_delivery_log(created_at DESC);

COMMENT ON TABLE slack_delivery_log IS 'Tracks Slack message delivery status';

ALTER TABLE slack_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY slack_delivery_tenant_select ON slack_delivery_log
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- SLACK NOTIFICATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION send_slack_notification(
    p_tenant_id UUID,
    p_notification_type VARCHAR,
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_color VARCHAR DEFAULT 'info'
) RETURNS BOOLEAN AS $$
DECLARE
    v_webhook_url TEXT;
    v_payload JSONB;
    v_result BOOLEAN := false;
BEGIN
    -- Get active webhook for tenant
    SELECT webhook_url INTO v_webhook_url
    FROM slack_webhooks
    WHERE tenant_id = p_tenant_id
      AND is_active = true
      AND consecutive_failures < 10
    LIMIT 1;

    -- No webhook configured
    IF v_webhook_url IS NULL THEN
        RETURN false;
    END IF;

    -- Build Slack payload
    v_payload := jsonb_build_object(
        'text', p_title,
        'attachments', jsonb_build_array(
            jsonb_build_object(
                'color', CASE p_color
                    WHEN 'critical' THEN '#DC2626'
                    WHEN 'high' THEN '#EA580C'
                    WHEN 'warning' THEN '#F59E0B'
                    WHEN 'success' THEN '#10B981'
                    WHEN 'info' THEN '#6366F1'
                    ELSE '#6366F1'
                END,
                'title', p_title,
                'text', p_message,
                'footer', 'Pink Beam ARM',
                'ts', extract(epoch from now())
            )
        )
    );

    -- Log the attempt (actual HTTP call happens in Edge Function or App)
    INSERT INTO slack_delivery_log (
        tenant_id,
        webhook_id,
        notification_type,
        status,
        created_at
    )
    SELECT 
        p_tenant_id,
        id,
        p_notification_type,
        'pending',
        NOW()
    FROM slack_webhooks
    WHERE tenant_id = p_tenant_id AND is_active = true;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ESCALATION SLACK TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_slack_on_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger for new escalations with open status
    IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
        -- Check if Slack webhook is configured and notification preferences allow it
        PERFORM send_slack_notification(
            NEW.tenant_id,
            'escalation',
            'New Escalation: ' || COALESCE(NEW.title, 'Untitled'),
            COALESCE(NEW.description, 'An escalation requires your attention.') || 
                E'\n\nUrgency: ' || NEW.urgency || 
                E'\nType: ' || NEW.type,
            '/portal/escalations/' || NEW.id,
            CASE NEW.urgency
                WHEN 'critical' THEN 'critical'
                WHEN 'high' THEN 'high'
                ELSE 'warning'
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escalation_slack_notification_trigger
    AFTER INSERT ON escalations
    FOR EACH ROW
    EXECUTE FUNCTION notify_slack_on_escalation();

-- ============================================================================
-- TASK FAILURE SLACK TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_slack_on_task_failed()
RETURNS TRIGGER AS $$
DECLARE
    v_agent_name TEXT;
    v_error_message TEXT;
BEGIN
    -- Only trigger when task changes to failed status
    IF TG_OP = 'UPDATE' AND NEW.status = 'failed' AND OLD.status != 'failed' THEN
        -- Get agent name
        SELECT name INTO v_agent_name
        FROM agents
        WHERE id = NEW.assignee_id
          AND tenant_id = NEW.tenant_id;

        -- Get error message from outputs
        v_error_message := NEW.outputs->>'error_message';

        PERFORM send_slack_notification(
            NEW.tenant_id,
            'task_failed',
            'Task Failed: ' || COALESCE(NEW.title, 'Untitled'),
            COALESCE(v_error_message, 'A task has failed and may require immediate attention.') ||
                E'\n\nAgent: ' || COALESCE(v_agent_name, 'Unknown') ||
                E'\nPriority: ' || NEW.priority,
            '/portal/tasks/' || NEW.id,
            CASE WHEN NEW.priority = 'urgent' THEN 'critical' ELSE 'high' END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_failed_slack_notification_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.status = 'failed' AND OLD.status != 'failed')
    EXECUTE FUNCTION notify_slack_on_task_failed();

-- ============================================================================
-- DECISION PENDING SLACK TRIGGER (runs on schedule/cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_slack_on_decision_pending()
RETURNS TRIGGER AS $$
DECLARE
    v_hours_pending NUMERIC;
    v_has_notification BOOLEAN;
BEGIN
    -- Only check decisions that are in 'proposed' status
    IF NEW.status != 'proposed' THEN
        RETURN NEW;
    END IF;

    -- Calculate hours since the decision was created
    v_hours_pending := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600;

    -- Only send reminder if pending for > 1 hour
    IF v_hours_pending < 1 THEN
        RETURN NEW;
    END IF;

    -- Check if we already sent a Slack notification in the last 24 hours
    SELECT EXISTS (
        SELECT 1 FROM slack_delivery_log
        WHERE tenant_id = NEW.tenant_id
          AND notification_type = 'decision_pending'
          AND status = 'delivered'
          AND created_at > NOW() - INTERVAL '24 hours'
    ) INTO v_has_notification;

    -- Don't spam - only send once per 24 hours
    IF v_has_notification THEN
        RETURN NEW;
    END IF;

    -- Send Slack notification
    PERFORM send_slack_notification(
        NEW.tenant_id,
        'decision_pending',
        'Decision Pending: ' || COALESCE(NEW.title, 'Untitled'),
        'A decision has been pending for ' || ROUND(v_hours_pending, 1) || ' hours and requires your attention.' ||
            E'\n\nProposed Action: ' || COALESCE(NEW.proposed_action, 'N/A') ||
            E'\nCategory: ' || COALESCE(NEW.category::TEXT, 'General'),
        '/portal/decisions/' || NEW.id,
        CASE 
            WHEN v_hours_pending > 24 THEN 'critical'
            WHEN v_hours_pending > 4 THEN 'high'
            ELSE 'warning'
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decision_pending_slack_notification_trigger
    AFTER UPDATE ON decisions
    FOR EACH ROW
    WHEN (OLD.status = 'proposed' AND NEW.status = 'proposed')
    EXECUTE FUNCTION notify_slack_on_decision_pending();

-- ============================================================================
-- DAILY DIGEST SUPPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION should_send_slack_daily_digest(
    p_tenant_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_webhook_exists BOOLEAN;
    v_last_digest TIMESTAMPTZ;
BEGIN
    -- Check if Slack webhook is configured
    SELECT EXISTS (
        SELECT 1 FROM slack_webhooks
        WHERE tenant_id = p_tenant_id
          AND is_active = true
    ) INTO v_webhook_exists;

    IF NOT v_webhook_exists THEN
        RETURN false;
    END IF;

    -- Check if we already sent a digest today
    SELECT MAX(created_at) INTO v_last_digest
    FROM slack_delivery_log
    WHERE tenant_id = p_tenant_id
      AND notification_type = 'daily_digest'
      AND status = 'delivered';

    -- Only send if no digest in last 20 hours (to handle timezone differences)
    RETURN v_last_digest IS NULL OR v_last_digest < NOW() - INTERVAL '20 hours';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_slack_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slack_webhook_update_timestamp
    BEFORE UPDATE ON slack_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_slack_webhook_timestamp();

-- ============================================================================
-- REALTIME SUBSCRIPTION
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE slack_webhooks;

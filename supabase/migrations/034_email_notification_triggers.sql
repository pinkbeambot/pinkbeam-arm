-- Migration: 034_email_notification_triggers
-- Description: Add database triggers for email notifications including decision reminders and welcome emails

-- ============================================================================
-- DECISION PENDING REMINDER TRIGGER
-- ============================================================================
-- Send reminder notification when a decision has been pending for > 1 hour

CREATE OR REPLACE FUNCTION notify_on_decision_pending()
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

    -- Check if we already sent a reminder in the last 24 hours
    SELECT EXISTS (
        SELECT 1 FROM notifications
        WHERE tenant_id = NEW.tenant_id
          AND related_entity_type = 'decision'
          AND related_entity_id = NEW.id
          AND type = 'warning'
          AND title LIKE '%Reminder%'
          AND created_at > NOW() - INTERVAL '24 hours'
    ) INTO v_has_notification;

    -- Don't spam - only send once per 24 hours
    IF v_has_notification THEN
        RETURN NEW;
    END IF;

    -- Create reminder notification
    PERFORM create_notification(
        NEW.tenant_id,
        NULL,  -- Broadcast to all users (or could be specific to decision approver)
        'warning'::notification_type,
        'Reminder: Decision Pending - ' || COALESCE(NEW.title, 'Untitled'),
        'A decision has been pending for ' || ROUND(v_hours_pending, 1) || ' hours and requires your attention.',
        '/portal/decisions/' || NEW.id,
        'Review Decision',
        'decision',
        NEW.id,
        jsonb_build_object(
            'decision_id', NEW.id,
            'decision_title', NEW.title,
            'hours_pending', v_hours_pending,
            'agent_id', NEW.agent_id,
            'category', NEW.category,
            'proposed_action', NEW.proposed_action,
            'deadline', NEW.deadline_at,
            'urgency', CASE 
                WHEN v_hours_pending > 24 THEN 'critical'
                WHEN v_hours_pending > 4 THEN 'high'
                ELSE 'normal'
            END
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that fires when a decision is updated (checks pending status)
CREATE TRIGGER decision_pending_reminder_trigger
    AFTER UPDATE ON decisions
    FOR EACH ROW
    WHEN (OLD.status = 'proposed' AND NEW.status = 'proposed')
    EXECUTE FUNCTION notify_on_decision_pending();

-- ============================================================================
-- TASK FAILED NOTIFICATION TRIGGER
-- ============================================================================
-- Enhanced notification when a task fails

CREATE OR REPLACE FUNCTION notify_on_task_failed()
RETURNS TRIGGER AS $$
DECLARE
    v_agent_name TEXT;
BEGIN
    -- Only trigger when task changes to failed status
    IF NEW.status != 'failed' OR OLD.status = 'failed' THEN
        RETURN NEW;
    END IF;

    -- Get agent name if assignee exists
    SELECT name INTO v_agent_name
    FROM agents
    WHERE id = NEW.assignee_id
      AND tenant_id = NEW.tenant_id;

    -- Create failure notification with high priority
    PERFORM create_notification(
        NEW.tenant_id,
        NULL,
        'error'::notification_type,
        'Task Failed: ' || COALESCE(NEW.title, 'Untitled'),
        COALESCE(
            NEW.outputs->>'error_message',
            'A task has failed and may require immediate attention.'
        ),
        '/portal/tasks/' || NEW.id,
        'Investigate',
        'task',
        NEW.id,
        jsonb_build_object(
            'task_id', NEW.id,
            'task_title', NEW.title,
            'status', NEW.status,
            'previous_status', OLD.status,
            'agent_id', NEW.assignee_id,
            'agent_name', v_agent_name,
            'error_message', NEW.outputs->>'error_message',
            'error_code', NEW.outputs->>'error_code',
            'failed_at', NOW()
        )
    );

    -- Also create an escalation for critical failures
    IF NEW.priority = 'urgent' OR NEW.cost_usd > 100 THEN
        INSERT INTO escalations (
            tenant_id,
            agent_id,
            task_id,
            type,
            urgency,
            status,
            title,
            description,
            agent_analysis
        ) VALUES (
            NEW.tenant_id,
            NEW.assignee_id,
            NEW.id,
            'error',
            CASE WHEN NEW.priority = 'urgent' THEN 'critical' ELSE 'high' END,
            'open',
            'Auto-escalated: Task Failure - ' || COALESCE(NEW.title, 'Untitled'),
            'Task failed with ' || COALESCE(NEW.outputs->>'error_message', 'unknown error') || '. Auto-escalated due to ' || 
                CASE 
                    WHEN NEW.priority = 'urgent' THEN 'urgent priority'
                    WHEN NEW.cost_usd > 100 THEN 'high cost impact ($' || ROUND(NEW.cost_usd::numeric, 2) || ')'
                    ELSE 'failure'
                END || '.',
            jsonb_build_object(
                'what_i_know', 'Task failed during execution',
                'what_i_dont_know', 'Root cause of failure',
                'what_i_tried', ARRAY['Automatic retry failed'],
                'suggested_resolution', 'Manual investigation required'
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create enhanced one
DROP TRIGGER IF EXISTS task_failed_notification_trigger ON tasks;

CREATE TRIGGER task_failed_notification_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.status = 'failed' AND OLD.status != 'failed')
    EXECUTE FUNCTION notify_on_task_failed();

-- ============================================================================
-- WELCOME EMAIL TRIGGER
-- ============================================================================
-- Send welcome notification when a new user is created

CREATE OR REPLACE FUNCTION notify_on_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_name TEXT;
BEGIN
    -- Get tenant name
    SELECT name INTO v_tenant_name
    FROM tenants
    WHERE id = NEW.tenant_id;

    -- Create welcome notification
    PERFORM create_notification(
        NEW.tenant_id,
        NEW.id,
        'success'::notification_type,
        'Welcome to Pink Beam ARM!',
        'Your account has been created successfully. Welcome to ' || COALESCE(v_tenant_name, 'your workspace') || '!',
        '/portal',
        'Get Started',
        'system',
        NEW.id,
        jsonb_build_object(
            'user_id', NEW.id,
            'user_name', NEW.name,
            'user_email', NEW.email,
            'tenant_id', NEW.tenant_id,
            'tenant_name', v_tenant_name,
            'welcome_type', CASE 
                WHEN EXISTS (
                    SELECT 1 FROM users 
                    WHERE tenant_id = NEW.tenant_id 
                      AND created_at < NEW.created_at
                ) THEN 'team_member'
                ELSE 'owner'
            END
        )
    );

    -- Create default notification preferences for the user
    INSERT INTO notification_preferences (
        tenant_id,
        user_id,
        notification_type,
        channels,
        min_priority
    )
    SELECT 
        NEW.tenant_id,
        NEW.id,
        type,
        CASE type
            WHEN 'task_assigned' THEN '{"in_app": true, "email": true, "webhook": false, "push": false}'::jsonb
            WHEN 'escalation_received' THEN '{"in_app": true, "email": true, "webhook": true, "push": true}'::jsonb
            WHEN 'decision_required' THEN '{"in_app": true, "email": true, "webhook": false, "push": true}'::jsonb
            WHEN 'system_alert' THEN '{"in_app": true, "email": true, "webhook": true, "push": true}'::jsonb
            ELSE '{"in_app": true, "email": false, "webhook": false, "push": false}'::jsonb
        END,
        CASE type
            WHEN 'escalation_received' THEN 'high'
            WHEN 'decision_required' THEN 'high'
            WHEN 'system_alert' THEN 'normal'
            ELSE 'normal'
        END
    FROM unnest(ARRAY['task_assigned', 'escalation_received', 'decision_required', 'system_alert']) AS type
    ON CONFLICT (tenant_id, user_id, notification_type) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new user welcome
CREATE TRIGGER user_welcome_notification_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_new_user();

-- ============================================================================
-- DAILY DIGEST SCHEDULER SUPPORT
-- ============================================================================
-- Function to be called by cron job for daily digest

CREATE OR REPLACE FUNCTION should_send_daily_digest(
    p_tenant_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_pref JSONB;
    v_last_digest TIMESTAMPTZ;
BEGIN
    -- Check if user has email enabled for system alerts
    SELECT channels INTO v_pref
    FROM notification_preferences
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND notification_type = 'system_alert';

    -- Default to true if no preference exists
    IF v_pref IS NULL OR (v_pref->>'email')::BOOLEAN = true THEN
        -- Check if we already sent a digest today
        SELECT MAX(created_at) INTO v_last_digest
        FROM notifications
        WHERE tenant_id = p_tenant_id
          AND user_id = p_user_id
          AND type = 'info'
          AND title LIKE '%Daily Digest%';

        -- Only send if no digest in last 20 hours (to handle timezone differences)
        RETURN v_last_digest IS NULL OR v_last_digest < NOW() - INTERVAL '20 hours';
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- EMAIL DELIVERY LOGGING
-- ============================================================================
-- Table to track email delivery status

CREATE TABLE IF NOT EXISTS email_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'complained'))
);

CREATE INDEX idx_email_delivery_tenant ON email_delivery_log(tenant_id);
CREATE INDEX idx_email_delivery_user ON email_delivery_log(user_id);
CREATE INDEX idx_email_delivery_status ON email_delivery_log(status);
CREATE INDEX idx_email_delivery_created ON email_delivery_log(created_at DESC);

ALTER TABLE email_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_delivery_tenant_view ON email_delivery_log
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

COMMENT ON TABLE email_delivery_log IS 'Tracks email delivery status for analytics and debugging';

-- Function to log email delivery attempt
CREATE OR REPLACE FUNCTION log_email_delivery(
    p_tenant_id UUID,
    p_user_id UUID,
    p_notification_id UUID,
    p_email_type VARCHAR,
    p_recipient_email VARCHAR,
    p_subject VARCHAR,
    p_status VARCHAR DEFAULT 'pending',
    p_provider_message_id VARCHAR DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO email_delivery_log (
        tenant_id,
        user_id,
        notification_id,
        email_type,
        recipient_email,
        subject,
        status,
        provider_message_id,
        error_message,
        sent_at
    ) VALUES (
        p_tenant_id,
        p_user_id,
        p_notification_id,
        p_email_type,
        p_recipient_email,
        p_subject,
        p_status,
        p_provider_message_id,
        p_error_message,
        CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RATE LIMITING
-- ============================================================================
-- Function to check email rate limits per user

CREATE OR REPLACE FUNCTION check_email_rate_limit(
    p_tenant_id UUID,
    p_user_id UUID,
    p_max_emails_per_hour INT DEFAULT 50
) RETURNS BOOLEAN AS $$
DECLARE
    v_email_count INT;
BEGIN
    SELECT COUNT(*) INTO v_email_count
    FROM email_delivery_log
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour';

    RETURN v_email_count < p_max_emails_per_hour;
END;
$$ LANGUAGE plpgsql STABLE;

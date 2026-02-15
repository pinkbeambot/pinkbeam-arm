-- Migration: 026_notification_preferences
-- Description: Add notification_preferences table for per-user notification settings
-- Supports: channel preferences, priority thresholds, quiet hours, browser/push settings

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "webhook": false, "push": false}'::jsonb,
    min_priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    quiet_hours JSONB DEFAULT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, notification_type),
    CONSTRAINT valid_notification_type CHECK (
        notification_type IN (
            'task_assigned', 'escalation_received', 'decision_required', 'system_alert',
            'info', 'success', 'warning', 'error'
        )
    ),
    CONSTRAINT valid_min_priority CHECK (
        min_priority IN ('low', 'normal', 'high', 'urgent')
    )
);

CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(tenant_id, user_id);

COMMENT ON TABLE notification_preferences IS 'Per-user notification preferences: channels, priority thresholds, quiet hours';
COMMENT ON COLUMN notification_preferences.channels IS 'JSON object: {in_app, email, webhook, push} booleans';
COMMENT ON COLUMN notification_preferences.quiet_hours IS 'JSON object: {enabled, start, end, timezone} for quiet period';
COMMENT ON COLUMN notification_preferences.settings IS 'Type-specific settings (min_escalation_urgency, deadline_warning_hours, etc.)';

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select ON notification_preferences
    FOR SELECT
    USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = current_setting('app.current_user_id')::UUID
    );

CREATE POLICY notification_preferences_insert ON notification_preferences
    FOR INSERT
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = current_setting('app.current_user_id')::UUID
    );

CREATE POLICY notification_preferences_update ON notification_preferences
    FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = current_setting('app.current_user_id')::UUID
    );

CREATE POLICY notification_preferences_delete ON notification_preferences
    FOR DELETE
    USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        AND user_id = current_setting('app.current_user_id')::UUID
    );

-- ============================================================================
-- BROWSER NOTIFICATION SETTINGS (per-user global settings)
-- ============================================================================

-- Add columns to support browser notification features
-- sound_enabled: whether to play notification sound
-- browser_notifications_enabled: whether browser Notification API is active
-- These are stored as tenant-level user settings in notification_preferences
-- via the 'settings' JSONB column on a special '_global' preference row

-- Helper function to get user's quiet hours setting
CREATE OR REPLACE FUNCTION is_in_quiet_hours(p_tenant_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_quiet_hours JSONB;
    v_enabled BOOLEAN;
    v_start TEXT;
    v_end TEXT;
    v_timezone TEXT;
    v_now TIME;
    v_start_time TIME;
    v_end_time TIME;
BEGIN
    -- Get quiet hours from any preference row (they share the same quiet_hours setting)
    SELECT quiet_hours INTO v_quiet_hours
    FROM notification_preferences
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND quiet_hours IS NOT NULL
    LIMIT 1;

    IF v_quiet_hours IS NULL THEN
        RETURN false;
    END IF;

    v_enabled := (v_quiet_hours->>'enabled')::BOOLEAN;
    IF NOT v_enabled THEN
        RETURN false;
    END IF;

    v_start := v_quiet_hours->>'start';
    v_end := v_quiet_hours->>'end';
    v_timezone := COALESCE(v_quiet_hours->>'timezone', 'UTC');

    v_now := (NOW() AT TIME ZONE v_timezone)::TIME;
    v_start_time := v_start::TIME;
    v_end_time := v_end::TIME;

    -- Handle overnight quiet hours (e.g., 22:00 to 08:00)
    IF v_start_time > v_end_time THEN
        RETURN v_now >= v_start_time OR v_now < v_end_time;
    ELSE
        RETURN v_now >= v_start_time AND v_now < v_end_time;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

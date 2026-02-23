-- Migration: Archive table RLS and configurable cleanup functions
-- Ensures activities_archive has proper tenant isolation and
-- makes cleanup functions accept configurable retention periods.

-- 1. Create activities_archive table if it doesn't exist
CREATE TABLE IF NOT EXISTS activities_archive (
    LIKE activities INCLUDING ALL,
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on activities_archive
ALTER TABLE activities_archive ENABLE ROW LEVEL SECURITY;

-- 3. Add tenant isolation policy
DROP POLICY IF EXISTS archive_tenant_isolation ON activities_archive;
CREATE POLICY archive_tenant_isolation ON activities_archive
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- 4. Add index for archived_at queries (cleanup performance)
CREATE INDEX IF NOT EXISTS idx_activities_archive_archived_at
    ON activities_archive (archived_at);

CREATE INDEX IF NOT EXISTS idx_activities_archive_tenant
    ON activities_archive (tenant_id);

-- 5. Replace archive_old_activities to be tenant-scoped
CREATE OR REPLACE FUNCTION archive_old_activities(
    p_tenant_id UUID,
    p_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Move old activities to archive for this tenant only
    WITH archived AS (
        DELETE FROM activities
        WHERE tenant_id = p_tenant_id
          AND created_at < NOW() - INTERVAL '1 day' * p_days
        RETURNING *
    )
    INSERT INTO activities_archive
    SELECT *, NOW() FROM archived;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Replace purge_archived_activities to be tenant-scoped
CREATE OR REPLACE FUNCTION purge_archived_activities(
    p_tenant_id UUID,
    p_days INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM activities_archive
    WHERE tenant_id = p_tenant_id
      AND archived_at < NOW() - INTERVAL '1 day' * p_days;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Replace cleanup_old_audit_logs to be tenant-scoped and configurable
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    p_tenant_id UUID,
    p_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM security_audit_log
    WHERE tenant_id = p_tenant_id
      AND created_at < NOW() - INTERVAL '1 day' * p_days;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

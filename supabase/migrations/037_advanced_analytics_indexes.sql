-- Migration: 037_advanced_analytics_indexes
-- Description: Add indexes for advanced analytics queries (ML predictions, heatmaps, insights)

-- ============================================================================
-- INDEXES FOR PREDICTIVE ANALYTICS
-- ============================================================================

-- Index for task completion time queries
CREATE INDEX IF NOT EXISTS idx_tasks_completion_time 
    ON tasks (tenant_id, status, started_at, completed_at) 
    WHERE status = 'completed';

-- Index for task type and priority analysis
CREATE INDEX IF NOT EXISTS idx_tasks_type_priority 
    ON tasks (tenant_id, type, priority, created_at);

-- Index for agent workload queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status 
    ON tasks (tenant_id, assignee_id, status) 
    WHERE assignee_id IS NOT NULL;

-- Index for cost analysis
CREATE INDEX IF NOT EXISTS idx_tasks_cost_analysis 
    ON tasks (tenant_id, cost_usd, created_at) 
    WHERE cost_usd IS NOT NULL;

-- ============================================================================
-- INDEXES FOR HEATMAP QUERIES
-- ============================================================================

-- Index for hourly activity patterns
CREATE INDEX IF NOT EXISTS idx_activities_hourly 
    ON activities (tenant_id, created_at, type, category);

-- Partial index for recent activities (last 90 days)
CREATE INDEX IF NOT EXISTS idx_activities_recent 
    ON activities (tenant_id, created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '90 days';

-- Index for activity category breakdowns
CREATE INDEX IF NOT EXISTS idx_activities_category_date 
    ON activities (tenant_id, category, created_at);

-- ============================================================================
-- INDEXES FOR ANOMALY DETECTION
-- ============================================================================

-- Index for daily metrics trend analysis
CREATE INDEX IF NOT EXISTS idx_agent_perf_daily_trend 
    ON agent_performance_daily (tenant_id, date DESC, success_rate, total_cost_usd);

-- Composite index for agent performance over time
CREATE INDEX IF NOT EXISTS idx_agent_perf_agent_date 
    ON agent_performance_daily (tenant_id, agent_id, date DESC);

-- ============================================================================
-- INDEXES FOR REAL-TIME METRICS
-- ============================================================================

-- Index for current task status counts
CREATE INDEX IF NOT EXISTS idx_tasks_status_tenant 
    ON tasks (tenant_id, status) 
    WHERE status IN ('queued', 'in_progress', 'blocked', 'review');

-- Index for recent task updates (for real-time calculations)
CREATE INDEX IF NOT EXISTS idx_tasks_recent_updates 
    ON tasks (tenant_id, updated_at DESC) 
    WHERE updated_at > NOW() - INTERVAL '1 hour';

-- Index for escalation status
CREATE INDEX IF NOT EXISTS idx_escalations_status 
    ON escalations (tenant_id, status, urgency) 
    WHERE status IN ('open', 'in_progress');

-- ============================================================================
-- ANALYTICS CACHE TABLE
-- ============================================================================

-- Create a table for caching expensive analytics calculations
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    cache_type TEXT NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, cache_key)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_analytics_cache_lookup 
    ON analytics_cache (tenant_id, cache_key, expires_at);

-- Index for cache cleanup (expired entries)
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expiry 
    ON analytics_cache (expires_at) 
    WHERE expires_at < NOW();

-- Enable RLS
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY analytics_cache_select_tenant ON analytics_cache
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY analytics_cache_insert_tenant ON analytics_cache
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY analytics_cache_update_tenant ON analytics_cache
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY analytics_cache_delete_tenant ON analytics_cache
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Service role bypass
CREATE POLICY analytics_cache_service_bypass ON analytics_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_analytics_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (if pg_cron is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'cleanup-analytics-cache',
            '0 */6 * * *', -- Every 6 hours
            'SELECT cleanup_expired_analytics_cache()'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available, skipping scheduled cleanup';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE analytics_cache IS 'Cache table for expensive analytics calculations';
COMMENT ON FUNCTION cleanup_expired_analytics_cache() IS 'Removes expired analytics cache entries';

COMMENT ON INDEX idx_tasks_completion_time IS 'Optimizes task completion time analysis for ML predictions';
COMMENT ON INDEX idx_activities_hourly IS 'Optimizes hourly activity pattern queries for heatmaps';
COMMENT ON INDEX idx_agent_perf_daily_trend IS 'Optimizes trend analysis for anomaly detection';

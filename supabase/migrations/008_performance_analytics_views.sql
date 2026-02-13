-- Migration: 008_performance_analytics_views
-- Description: Materialized views for Performance Dashboard analytics

-- Enable pg_cron extension for scheduled refreshes (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- AGENT PERFORMANCE DAILY MATERIALIZED VIEW
-- ============================================================================
-- Aggregated daily metrics per agent for performance tracking

CREATE MATERIALIZED VIEW IF NOT EXISTS agent_performance_daily AS
WITH daily_task_stats AS (
    SELECT 
        t.tenant_id,
        t.assignee_id as agent_id,
        DATE(t.created_at) as date,
        COUNT(*) FILTER (WHERE t.created_at IS NOT NULL) as tasks_created,
        COUNT(*) FILTER (WHERE t.status = 'completed' AND DATE(t.completed_at) = DATE(t.created_at)) as tasks_completed,
        COUNT(*) FILTER (WHERE t.status = 'failed' AND DATE(t.updated_at) = DATE(t.created_at)) as tasks_failed,
        COUNT(*) FILTER (WHERE t.status = 'cancelled' AND DATE(t.updated_at) = DATE(t.created_at)) as tasks_cancelled,
        AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at))) FILTER (WHERE t.status = 'completed' AND t.completed_at IS NOT NULL AND t.started_at IS NOT NULL) as avg_task_duration_seconds,
        SUM(t.cost_usd) FILTER (WHERE t.cost_usd IS NOT NULL) as total_cost_usd,
        SUM(t.tokens_used) FILTER (WHERE t.tokens_used IS NOT NULL) as total_tokens_used
    FROM tasks t
    WHERE t.assignee_id IS NOT NULL
    GROUP BY t.tenant_id, t.assignee_id, DATE(t.created_at)
),
daily_decision_stats AS (
    SELECT 
        d.tenant_id,
        d.agent_id,
        DATE(d.proposed_at) as date,
        COUNT(*) FILTER (WHERE d.status IN ('approved', 'executed')) as decisions_made,
        COUNT(*) FILTER (WHERE d.status = 'overridden') as decisions_overridden,
        AVG((d.reasoning->>'confidence')::numeric) FILTER (WHERE d.reasoning->>'confidence' IS NOT NULL) as avg_confidence
    FROM decisions d
    GROUP BY d.tenant_id, d.agent_id, DATE(d.proposed_at)
),
daily_escalation_stats AS (
    SELECT 
        e.tenant_id,
        e.agent_id,
        DATE(e.created_at) as date,
        COUNT(*) as escalations_raised,
        COUNT(*) FILTER (WHERE e.status = 'resolved' AND DATE(e.resolved_at) = DATE(e.created_at)) as escalations_resolved_same_day,
        AVG(e.time_to_resolve_seconds) FILTER (WHERE e.time_to_resolve_seconds IS NOT NULL) as avg_resolution_time_seconds
    FROM escalations e
    GROUP BY e.tenant_id, e.agent_id, DATE(e.created_at)
),
date_range AS (
    SELECT 
        tenant_id,
        agent_id,
        generate_series(
            DATE(NOW() - INTERVAL '90 days'),
            DATE(NOW()),
            INTERVAL '1 day'
        )::DATE as date
    FROM (SELECT DISTINCT tenant_id, id as agent_id FROM agents) a
)
SELECT 
    dr.tenant_id,
    dr.agent_id,
    dr.date,
    a.name as agent_name,
    a.role as agent_role,
    a.status as agent_status,
    COALESCE(ts.tasks_created, 0) as tasks_created,
    COALESCE(ts.tasks_completed, 0) as tasks_completed,
    COALESCE(ts.tasks_failed, 0) as tasks_failed,
    COALESCE(ts.tasks_cancelled, 0) as tasks_cancelled,
    CASE 
        WHEN COALESCE(ts.tasks_completed, 0) + COALESCE(ts.tasks_failed, 0) > 0 
        THEN ROUND((ts.tasks_completed::numeric / (ts.tasks_completed + ts.tasks_failed)) * 100, 2)
        ELSE 100.0
    END as success_rate,
    ts.avg_task_duration_seconds,
    COALESCE(ts.total_cost_usd, 0) as total_cost_usd,
    COALESCE(ts.total_tokens_used, 0) as total_tokens_used,
    COALESCE(ds.decisions_made, 0) as decisions_made,
    COALESCE(ds.decisions_overridden, 0) as decisions_overridden,
    CASE 
        WHEN COALESCE(ds.decisions_made, 0) + COALESCE(ds.decisions_overridden, 0) > 0 
        THEN ROUND((ds.decisions_overridden::numeric / (ds.decisions_made + ds.decisions_overridden)) * 100, 2)
        ELSE 0.0
    END as override_rate,
    ds.avg_confidence,
    COALESCE(es.escalations_raised, 0) as escalations_raised,
    COALESCE(es.escalations_resolved_same_day, 0) as escalations_resolved_same_day,
    es.avg_resolution_time_seconds,
    NOW() as refreshed_at
FROM date_range dr
JOIN agents a ON dr.agent_id = a.id AND dr.tenant_id = a.tenant_id
LEFT JOIN daily_task_stats ts ON dr.tenant_id = ts.tenant_id 
    AND dr.agent_id = ts.agent_id 
    AND dr.date = ts.date
LEFT JOIN daily_decision_stats ds ON dr.tenant_id = ds.tenant_id 
    AND dr.agent_id = ds.agent_id 
    AND dr.date = ds.date
LEFT JOIN daily_escalation_stats es ON dr.tenant_id = es.tenant_id 
    AND dr.agent_id = es.agent_id 
    AND dr.date = es.date
WHERE dr.date >= DATE(NOW() - INTERVAL '90 days');

-- Create indexes for agent_performance_daily
CREATE UNIQUE INDEX idx_agent_perf_daily_pk ON agent_performance_daily(tenant_id, agent_id, date);
CREATE INDEX idx_agent_perf_daily_tenant_date ON agent_performance_daily(tenant_id, date);
CREATE INDEX idx_agent_perf_daily_agent ON agent_performance_daily(agent_id);
CREATE INDEX idx_agent_perf_daily_date ON agent_performance_daily(date DESC);

COMMENT ON MATERIALIZED VIEW agent_performance_daily IS 'Daily aggregated performance metrics per agent for dashboard analytics';

-- ============================================================================
-- TASK METRICS HOURLY MATERIALIZED VIEW
-- ============================================================================
-- Hourly task pipeline metrics for bottleneck identification

CREATE MATERIALIZED VIEW IF NOT EXISTS task_metrics_hourly AS
WITH hourly_stats AS (
    SELECT 
        t.tenant_id,
        DATE_TRUNC('hour', t.created_at) as hour,
        t.status,
        COUNT(*) as task_count,
        AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))) FILTER (WHERE t.completed_at IS NOT NULL) as avg_time_to_complete_seconds,
        AVG(EXTRACT(EPOCH FROM (t.started_at - t.created_at))) FILTER (WHERE t.started_at IS NOT NULL) as avg_time_to_start_seconds,
        SUM(t.cost_usd) as total_cost_usd,
        SUM(t.tokens_used) as total_tokens_used
    FROM tasks t
    WHERE t.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY t.tenant_id, DATE_TRUNC('hour', t.created_at), t.status
),
pipeline_stage_times AS (
    SELECT 
        tenant_id,
        DATE_TRUNC('hour', created_at) as hour,
        AVG(CASE 
            WHEN started_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (started_at - created_at))
            ELSE NULL
        END) as avg_queued_duration_seconds,
        AVG(CASE 
            WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (completed_at - started_at))
            ELSE NULL
        END) as avg_processing_duration_seconds,
        AVG(CASE 
            WHEN status IN ('completed', 'failed') AND completed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (completed_at - created_at))
            ELSE NULL
        END) as avg_total_duration_seconds
    FROM tasks
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY tenant_id, DATE_TRUNC('hour', created_at)
),
blocked_tasks AS (
    SELECT 
        tenant_id,
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) FILTER (WHERE status = 'blocked') as avg_blocked_duration_seconds
    FROM tasks
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY tenant_id, DATE_TRUNC('hour', created_at)
)
SELECT 
    pst.tenant_id,
    pst.hour,
    pst.avg_queued_duration_seconds,
    pst.avg_processing_duration_seconds,
    pst.avg_total_duration_seconds,
    COALESCE(bt.blocked_count, 0) as blocked_tasks_count,
    bt.avg_blocked_duration_seconds,
    jsonb_object_agg(
        COALESCE(hs.status, 'unknown'),
        jsonb_build_object(
            'count', COALESCE(hs.task_count, 0),
            'avg_time_to_complete', hs.avg_time_to_complete_seconds,
            'avg_time_to_start', hs.avg_time_to_start_seconds,
            'total_cost', COALESCE(hs.total_cost_usd, 0),
            'total_tokens', COALESCE(hs.total_tokens_used, 0)
        )
    ) FILTER (WHERE hs.status IS NOT NULL) as status_breakdown,
    SUM(COALESCE(hs.total_cost_usd, 0)) as hourly_total_cost_usd,
    SUM(COALESCE(hs.task_count, 0)) as hourly_total_tasks,
    NOW() as refreshed_at
FROM pipeline_stage_times pst
LEFT JOIN blocked_tasks bt ON pst.tenant_id = bt.tenant_id AND pst.hour = bt.hour
LEFT JOIN hourly_stats hs ON pst.tenant_id = hs.tenant_id AND pst.hour = hs.hour
GROUP BY pst.tenant_id, pst.hour, pst.avg_queued_duration_seconds, 
         pst.avg_processing_duration_seconds, pst.avg_total_duration_seconds,
         bt.blocked_count, bt.avg_blocked_duration_seconds;

-- Create indexes for task_metrics_hourly
CREATE UNIQUE INDEX idx_task_metrics_hourly_pk ON task_metrics_hourly(tenant_id, hour);
CREATE INDEX idx_task_metrics_hourly_tenant ON task_metrics_hourly(tenant_id);
CREATE INDEX idx_task_metrics_hourly_hour ON task_metrics_hourly(hour DESC);

COMMENT ON MATERIALIZED VIEW task_metrics_hourly IS 'Hourly task pipeline metrics for bottleneck analysis';

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================

-- Function to refresh agent_performance_daily
CREATE OR REPLACE FUNCTION refresh_agent_performance_daily()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_daily;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh task_metrics_hourly
CREATE OR REPLACE FUNCTION refresh_task_metrics_hourly()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY task_metrics_hourly;
END;
$$ LANGUAGE plpgsql;

-- Combined refresh function
CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
RETURNS void AS $$
BEGIN
    PERFORM refresh_agent_performance_daily();
    PERFORM refresh_task_metrics_hourly();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PG_CRON SCHEDULED JOBS
-- ============================================================================
-- Schedule automatic refresh of materialized views

-- Remove existing jobs if they exist (for idempotency)
DO $$
BEGIN
    -- Note: pg_cron job names are unique per database
    -- These will fail silently if jobs don't exist
    PERFORM cron.unschedule('refresh_agent_performance_daily');
    PERFORM cron.unschedule('refresh_task_metrics_hourly');
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if jobs don't exist
    NULL;
END $$;

-- Schedule daily refresh at 1 AM UTC for agent_performance_daily
SELECT cron.schedule(
    'refresh_agent_performance_daily',
    '0 1 * * *',  -- Every day at 1:00 AM UTC
    'SELECT refresh_agent_performance_daily()'
);

-- Schedule hourly refresh at 5 minutes past the hour for task_metrics_hourly
SELECT cron.schedule(
    'refresh_task_metrics_hourly',
    '5 * * * *',  -- Every hour at 5 minutes past
    'SELECT refresh_task_metrics_hourly()'
);

-- ============================================================================
-- ANALYTICS HELPER FUNCTIONS
-- ============================================================================

-- Function to get agent performance summary with trends
CREATE OR REPLACE FUNCTION get_agent_performance_summary(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    agent_id UUID,
    agent_name VARCHAR,
    agent_role agent_role,
    total_tasks_completed BIGINT,
    total_tasks_failed BIGINT,
    success_rate NUMERIC,
    avg_task_duration_seconds NUMERIC,
    total_cost_usd NUMERIC,
    total_escalations BIGINT,
    override_rate NUMERIC,
    trend_direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH performance_agg AS (
        SELECT 
            apd.agent_id,
            apd.agent_name,
            apd.agent_role,
            SUM(apd.tasks_completed) as total_completed,
            SUM(apd.tasks_failed) as total_failed,
            ROUND(AVG(apd.success_rate), 2) as avg_success_rate,
            ROUND(AVG(apd.avg_task_duration_seconds), 2) as avg_duration,
            ROUND(SUM(apd.total_cost_usd), 4) as total_cost,
            SUM(apd.escalations_raised) as total_escalations,
            ROUND(AVG(apd.override_rate), 2) as avg_override_rate,
            -- Calculate trend based on last 7 days vs previous 7 days
            ROUND(AVG(apd.success_rate) FILTER (WHERE apd.date >= CURRENT_DATE - INTERVAL '7 days'), 2) as recent_success_rate,
            ROUND(AVG(apd.success_rate) FILTER (WHERE apd.date >= CURRENT_DATE - INTERVAL '14 days' AND apd.date < CURRENT_DATE - INTERVAL '7 days'), 2) as previous_success_rate
        FROM agent_performance_daily apd
        WHERE apd.tenant_id = p_tenant_id
        AND apd.date BETWEEN p_start_date AND p_end_date
        GROUP BY apd.agent_id, apd.agent_name, apd.agent_role
    )
    SELECT 
        pa.agent_id,
        pa.agent_name,
        pa.agent_role,
        pa.total_completed,
        pa.total_failed,
        pa.avg_success_rate,
        pa.avg_duration,
        pa.total_cost,
        pa.total_escalations,
        pa.avg_override_rate,
        CASE 
            WHEN pa.recent_success_rate > pa.previous_success_rate THEN 'improving'
            WHEN pa.recent_success_rate < pa.previous_success_rate THEN 'declining'
            ELSE 'stable'
        END as trend_direction
    FROM performance_agg pa
    ORDER BY pa.total_completed DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get ROI metrics
CREATE OR REPLACE FUNCTION get_roi_metrics(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_tasks_completed BIGINT,
    total_cost_usd NUMERIC,
    cost_per_task NUMERIC,
    tasks_per_dollar NUMERIC,
    estimated_hours_saved NUMERIC,
    avg_human_cost_per_hour NUMERIC DEFAULT 50.00,
    estimated_value_generated NUMERIC,
    roi_percentage NUMERIC
) AS $$
DECLARE
    v_total_cost NUMERIC;
    v_total_completed BIGINT;
    v_avg_duration NUMERIC;
BEGIN
    SELECT 
        COALESCE(SUM(apd.total_cost_usd), 0),
        COALESCE(SUM(apd.tasks_completed), 0),
        COALESCE(AVG(apd.avg_task_duration_seconds), 0)
    INTO v_total_cost, v_total_completed, v_avg_duration
    FROM agent_performance_daily apd
    WHERE apd.tenant_id = p_tenant_id
    AND apd.date BETWEEN p_start_date AND p_end_date;

    RETURN QUERY
    SELECT 
        v_total_completed,
        ROUND(v_total_cost, 4),
        CASE 
            WHEN v_total_completed > 0 THEN ROUND(v_total_cost / v_total_completed, 4)
            ELSE 0
        END as cost_per_task,
        CASE 
            WHEN v_total_cost > 0 THEN ROUND(v_total_completed / v_total_cost, 2)
            ELSE 0
        END as tasks_per_dollar,
        ROUND((v_total_completed * v_avg_duration) / 3600, 2) as estimated_hours_saved,
        50.00 as avg_human_cost_per_hour,
        ROUND((v_total_completed * v_avg_duration / 3600) * 50, 2) as estimated_value_generated,
        CASE 
            WHEN v_total_cost > 0 THEN ROUND((((v_total_completed * v_avg_duration / 3600) * 50) - v_total_cost) / v_total_cost * 100, 2)
            ELSE 0
        END as roi_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to identify bottlenecks
CREATE OR REPLACE FUNCTION identify_bottlenecks(
    p_tenant_id UUID,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    bottleneck_type TEXT,
    description TEXT,
    affected_count BIGINT,
    avg_wait_time_seconds NUMERIC,
    severity TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_metrics AS (
        SELECT *
        FROM task_metrics_hourly tmh
        WHERE tmh.tenant_id = p_tenant_id
        AND tmh.hour >= NOW() - INTERVAL '1 hour' * p_hours_back
    ),
    blocked_analysis AS (
        SELECT 
            'blocked_tasks'::TEXT as b_type,
            'Tasks stuck in blocked state'::TEXT as desc,
            SUM(blocked_tasks_count)::BIGINT as count,
            AVG(avg_blocked_duration_seconds)::NUMERIC as avg_wait,
            CASE 
                WHEN SUM(blocked_tasks_count) > 10 THEN 'high'
                WHEN SUM(blocked_tasks_count) > 0 THEN 'medium'
                ELSE 'low'
            END as sev
        FROM recent_metrics
        WHERE blocked_tasks_count > 0
    ),
    queue_analysis AS (
        SELECT 
            'long_queue_times'::TEXT as b_type,
            'Tasks taking too long to start'::TEXT as desc,
            (status_breakdown->'queued'->>'count')::BIGINT as count,
            avg_queued_duration_seconds::NUMERIC as avg_wait,
            CASE 
                WHEN avg_queued_duration_seconds > 3600 THEN 'high'
                WHEN avg_queued_duration_seconds > 600 THEN 'medium'
                ELSE 'low'
            END as sev
        FROM recent_metrics
        WHERE avg_queued_duration_seconds > 300
        ORDER BY hour DESC
        LIMIT 1
    ),
    processing_analysis AS (
        SELECT 
            'slow_processing'::TEXT as b_type,
            'Tasks taking too long to complete'::TEXT as desc,
            ((status_breakdown->'in_progress'->>'count')::BIGINT + 
             (status_breakdown->'completed'->>'count')::BIGINT) as count,
            avg_processing_duration_seconds::NUMERIC as avg_wait,
            CASE 
                WHEN avg_processing_duration_seconds > 7200 THEN 'high'
                WHEN avg_processing_duration_seconds > 1800 THEN 'medium'
                ELSE 'low'
            END as sev
        FROM recent_metrics
        WHERE avg_processing_duration_seconds > 900
        ORDER BY hour DESC
        LIMIT 1
    )
    SELECT 
        ba.b_type,
        ba.desc,
        ba.count,
        ba.avg_wait,
        ba.sev,
        CASE ba.b_type
            WHEN 'blocked_tasks' THEN 'Review task dependencies and resolve blockers'
            WHEN 'long_queue_times' THEN 'Consider adding more agent capacity'
            ELSE 'Review agent efficiency and task complexity'
        END as recommendation
    FROM blocked_analysis ba
    WHERE ba.count > 0
    
    UNION ALL
    
    SELECT 
        qa.b_type,
        qa.desc,
        qa.count,
        qa.avg_wait,
        qa.sev,
        'Consider adding more agent capacity or optimizing task routing' as recommendation
    FROM queue_analysis qa
    WHERE qa.count > 0
    
    UNION ALL
    
    SELECT 
        pa.b_type,
        pa.desc,
        pa.count,
        pa.avg_wait,
        pa.sev,
        'Review agent configuration and task complexity' as recommendation
    FROM processing_analysis pa
    WHERE pa.count > 0
    
    ORDER BY 
        CASE severity 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            ELSE 3 
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to get workload distribution for heatmap
CREATE OR REPLACE FUNCTION get_workload_heatmap(
    p_tenant_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    day_of_week INTEGER,
    hour_of_day INTEGER,
    tasks_created BIGINT,
    tasks_completed BIGINT,
    avg_active_agents NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(DOW FROM apd.date)::INTEGER as day_of_week,
        0 as hour_of_day,  -- Daily aggregation for now
        SUM(apd.tasks_created)::BIGINT as tasks_created,
        SUM(apd.tasks_completed)::BIGINT as tasks_completed,
        ROUND(AVG(apd.tasks_created), 2) as avg_active_agents
    FROM agent_performance_daily apd
    WHERE apd.tenant_id = p_tenant_id
    AND apd.date >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY EXTRACT(DOW FROM apd.date)
    ORDER BY day_of_week;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS FOR API
-- ============================================================================

-- Function to get agent backlogs for bottleneck analysis
CREATE OR REPLACE FUNCTION get_agent_backlogs(p_tenant_id UUID)
RETURNS TABLE (
    assignee_id UUID,
    name VARCHAR,
    pending_tasks BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.assignee_id,
        a.name,
        COUNT(*)::BIGINT as pending_tasks
    FROM tasks t
    JOIN agents a ON t.assignee_id = a.id
    WHERE t.tenant_id = p_tenant_id
    AND a.tenant_id = p_tenant_id
    AND t.status IN ('queued', 'in_progress')
    GROUP BY t.assignee_id, a.name
    ORDER BY pending_tasks DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to get pipeline counts by status
CREATE OR REPLACE FUNCTION get_pipeline_counts(p_tenant_id UUID)
RETURNS TABLE (
    status VARCHAR,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.status::VARCHAR,
        COUNT(*)::BIGINT
    FROM tasks t
    WHERE t.tenant_id = p_tenant_id
    AND t.status IN ('queued', 'in_progress', 'blocked', 'review')
    GROUP BY t.status;
END;
$$ LANGUAGE plpgsql;

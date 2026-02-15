import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { analyticsBottlenecksQuerySchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * Cache configuration
 */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for bottlenecks (more frequent updates)

function getCachedData(key: string): unknown | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * GET /api/analytics/bottlenecks
 * Identify workflow bottlenecks and delays
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      hours: searchParams.get('hours') || '24',
    };

    const validatedQuery = analyticsBottlenecksQuerySchema.parse(queryParams);
    const hours = validatedQuery.hours;

    // Check cache
    const cacheKey = `analytics:bottlenecks:${tenantId}:${hours}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true });
    }

    // Query task_metrics_hourly directly instead of using RPC function
    // (the identify_bottlenecks function has a UNION ALL ORDER BY bug)
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data: recentMetrics, error: metricsError } = await supabase
      .from('task_metrics_hourly')
      .select('hour, blocked_tasks_count, avg_blocked_duration_seconds, avg_queued_duration_seconds, avg_processing_duration_seconds, status_breakdown')
      .eq('tenant_id', tenantId)
      .gte('hour', cutoff)
      .order('hour', { ascending: false });

    if (metricsError) {
      console.error('Error fetching hourly metrics for bottlenecks:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch bottlenecks', details: metricsError.message },
        { status: 500 }
      );
    }

    // Identify bottlenecks from metrics (replicates identify_bottlenecks SQL logic)
    interface BottleneckCandidate {
      bottleneck_type: string;
      description: string;
      affected_count: number;
      avg_wait_time_seconds: number;
      severity: string;
      recommendation: string;
    }

    const bottleneckData: BottleneckCandidate[] = [];
    const metrics = recentMetrics || [];

    // Blocked tasks analysis
    const totalBlocked = metrics.reduce((sum, m) => sum + (m.blocked_tasks_count || 0), 0);
    const avgBlockedDuration = metrics.filter(m => m.avg_blocked_duration_seconds)
      .reduce((sum, m, _, arr) => sum + (m.avg_blocked_duration_seconds || 0) / arr.length, 0);
    if (totalBlocked > 0) {
      bottleneckData.push({
        bottleneck_type: 'blocked_tasks',
        description: 'Tasks stuck in blocked state',
        affected_count: totalBlocked,
        avg_wait_time_seconds: avgBlockedDuration,
        severity: totalBlocked > 10 ? 'high' : 'medium',
        recommendation: 'Review task dependencies and resolve blockers',
      });
    }

    // Queue time analysis (use most recent metric)
    const latestWithQueue = metrics.find(m => m.avg_queued_duration_seconds && m.avg_queued_duration_seconds > 300);
    if (latestWithQueue) {
      const queuedCount = latestWithQueue.status_breakdown
        ? parseInt((latestWithQueue.status_breakdown as Record<string, { count?: string }>)?.queued?.count || '0')
        : 0;
      if (queuedCount > 0) {
        bottleneckData.push({
          bottleneck_type: 'long_queue_times',
          description: 'Tasks taking too long to start',
          affected_count: queuedCount,
          avg_wait_time_seconds: latestWithQueue.avg_queued_duration_seconds,
          severity: latestWithQueue.avg_queued_duration_seconds > 3600 ? 'high' : 'medium',
          recommendation: 'Consider adding more agent capacity or optimizing task routing',
        });
      }
    }

    // Processing time analysis
    const latestWithSlow = metrics.find(m => m.avg_processing_duration_seconds && m.avg_processing_duration_seconds > 900);
    if (latestWithSlow) {
      const inProgressCount = latestWithSlow.status_breakdown
        ? parseInt((latestWithSlow.status_breakdown as Record<string, { count?: string }>)?.in_progress?.count || '0')
        : 0;
      const completedCount = latestWithSlow.status_breakdown
        ? parseInt((latestWithSlow.status_breakdown as Record<string, { count?: string }>)?.completed?.count || '0')
        : 0;
      const totalAffected = inProgressCount + completedCount;
      if (totalAffected > 0) {
        bottleneckData.push({
          bottleneck_type: 'slow_processing',
          description: 'Tasks taking too long to complete',
          affected_count: totalAffected,
          avg_wait_time_seconds: latestWithSlow.avg_processing_duration_seconds,
          severity: latestWithSlow.avg_processing_duration_seconds > 7200 ? 'high' : 'medium',
          recommendation: 'Review agent configuration and task complexity',
        });
      }
    }

    // Sort by severity (high first)
    bottleneckData.sort((a, b) => {
      const severityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    });

    // Get tasks waiting longest
    const { data: longestWaitingTasks, error: waitingError } = await supabase
      .from('tasks')
      .select('id, title, status, created_at, started_at, assignee_id, assignee:assignee_id(id, name)')
      .eq('tenant_id', tenantId)
      .in('status', ['queued', 'blocked'])
      .order('created_at', { ascending: true })
      .limit(10);

    if (waitingError) {
      console.error('Error fetching waiting tasks:', waitingError);
    }

    // Get agents with high backlogs using raw SQL
    const { data: agentBacklogs, error: backlogError } = await supabase.rpc(
      'get_agent_backlogs',
      { p_tenant_id: tenantId }
    );

    if (backlogError) {
      console.error('Error fetching agent backlogs:', backlogError);
    }

    // Get dependency chain delays from task_dependencies
    const { data: blockedByDeps, error: depsError } = await supabase
      .from('task_dependencies')
      .select(`
        id,
        task_id,
        depends_on_task_id,
        dependency_type
      `)
      .eq('tenant_id', tenantId)
      .limit(20);

    if (depsError) {
      console.error('Error fetching dependencies:', depsError);
    }

    // Get the task details for dependencies
    const taskIds = new Set<string>();
    const dependsOnIds = new Set<string>();
    (blockedByDeps || []).forEach(dep => {
      taskIds.add(dep.task_id);
      dependsOnIds.add(dep.depends_on_task_id);
    });

    const allTaskIds = Array.from(new Set([...taskIds, ...dependsOnIds]));

    let taskDetails: Record<string, { id: string; title: string; status: string; created_at: string }> = {};
    if (allTaskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, created_at')
        .eq('tenant_id', tenantId)
        .in('id', allTaskIds.slice(0, 50));

      taskDetails = (tasks || []).reduce((acc, task) => {
        acc[task.id] = task;
        return acc;
      }, {} as Record<string, { id: string; title: string; status: string; created_at: string }>);
    }

    // Calculate time-in-stage analysis (reuse recentMetrics from bottleneck query)
    const timeInStage = {
      queued: { count: 0, avgTime: 0, maxTime: 0 },
      in_progress: { count: 0, avgTime: 0, maxTime: 0 },
      blocked: { count: 0, avgTime: 0, maxTime: 0 },
      review: { count: 0, avgTime: 0, maxTime: 0 },
    };

    // Calculate metrics from hourly data
    (metrics).forEach(metric => {
      if (metric.avg_queued_duration_seconds) {
        timeInStage.queued.avgTime = metric.avg_queued_duration_seconds;
      }
      if (metric.avg_processing_duration_seconds) {
        timeInStage.in_progress.avgTime = metric.avg_processing_duration_seconds;
      }
      if (metric.blocked_tasks_count) {
        timeInStage.blocked.count = Math.max(timeInStage.blocked.count, metric.blocked_tasks_count);
      }
    });

    // Get current pipeline snapshot
    const pipelineSnapshot = {
      queued: 0,
      in_progress: 0,
      blocked: 0,
      review: 0,
    };

    // Count tasks by status using raw query
    const { data: pipelineCounts, error: pipelineError } = await supabase
      .rpc('get_pipeline_counts', { p_tenant_id: tenantId });

    if (pipelineError) {
      console.error('Error fetching pipeline counts:', pipelineError);
    } else {
      (pipelineCounts || []).forEach((row: { status: string; count: number }) => {
        if (row.status in pipelineSnapshot) {
          pipelineSnapshot[row.status as keyof typeof pipelineSnapshot] = row.count;
        }
      });
    }

    // Process waiting tasks
    const tasksWaitingLongest = (longestWaitingTasks || []).map(task => {
      const waitingTime = Date.now() - new Date(task.created_at).getTime();
      const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        waitingTimeSeconds: Math.floor(waitingTime / 1000),
        assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
      };
    });

    // Process agent backlogs
    const agentWorkload = (agentBacklogs || []).map((agent: { assignee_id: string; name: string; pending_tasks: number }) => ({
      agentId: agent.assignee_id,
      name: agent.name || 'Unknown',
      pendingTasks: agent.pending_tasks,
    }));

    // Process dependency delays
    const dependencyDelays = (blockedByDeps || [])
      .filter(dep => {
        const dependsOnTask = taskDetails[dep.depends_on_task_id];
        return dependsOnTask && dependsOnTask.status !== 'completed';
      })
      .map(dep => ({
        taskId: dep.task_id,
        taskTitle: taskDetails[dep.task_id]?.title || 'Unknown',
        blockedByTaskId: dep.depends_on_task_id,
        blockedByTaskTitle: taskDetails[dep.depends_on_task_id]?.title || 'Unknown',
        blockedByStatus: taskDetails[dep.depends_on_task_id]?.status || 'unknown',
        dependencyType: dep.dependency_type,
      }));

    // Format bottleneck data
    const identifiedBottlenecks = bottleneckData.map(b => ({
      type: b.bottleneck_type,
      description: b.description,
      affectedCount: b.affected_count,
      avgWaitTimeSeconds: b.avg_wait_time_seconds,
      severity: b.severity,
      recommendation: b.recommendation,
    }));

    const response = {
      summary: {
        totalBottlenecks: identifiedBottlenecks.length,
        highSeverityCount: identifiedBottlenecks.filter((b: { severity: string }) => b.severity === 'high').length,
        totalBlockedTasks: pipelineSnapshot.blocked,
        avgWaitTime: identifiedBottlenecks.length > 0
          ? identifiedBottlenecks.reduce((sum: number, b: { avgWaitTimeSeconds: number }) => sum + b.avgWaitTimeSeconds, 0) / identifiedBottlenecks.length
          : 0,
      },
      bottlenecks: identifiedBottlenecks,
      pipelineSnapshot,
      timeInStage,
      tasksWaitingLongest,
      agentWorkload,
      dependencyDelays,
      recommendations: identifiedBottlenecks.map((b: { type: string; severity: string; recommendation: string; affectedCount: number }) => ({
        type: b.type,
        severity: b.severity,
        action: b.recommendation,
        impact: b.affectedCount,
      })),
      period: { hours },
      generatedAt: new Date().toISOString(),
    };

    // Cache the response
    setCachedData(cacheKey, response);

    return NextResponse.json({ data: response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/analytics/bottlenecks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

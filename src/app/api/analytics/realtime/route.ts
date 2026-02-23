import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

/**
 * GET /api/analytics/realtime
 * Returns aggregated real-time metrics computed from actual database data.
 * Replaces simulated Math.random() values with real task, decision, and escalation data.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Run all queries in parallel for performance
    const [
      tasksByStatusResult,
      taskDurationsResult,
      recentTasksResult,
      decisionsResult,
      escalationsResult,
      escalationResolutionResult,
      agentTasksResult,
    ] = await Promise.all([
      // 1. Task counts by status
      supabase
        .from('tasks')
        .select('status')
        .eq('tenant_id', tenantId),

      // 2. Average task duration (completed tasks with both timestamps)
      supabase
        .from('tasks')
        .select('started_at, completed_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .not('started_at', 'is', null)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(100),

      // 3. Recent tasks (last hour) for throughput calculation
      supabase
        .from('tasks')
        .select('status, completed_at, assignee_id')
        .eq('tenant_id', tenantId)
        .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),

      // 4. Decision counts by status + confidence from reasoning JSONB
      supabase
        .from('decisions')
        .select('status, reasoning')
        .eq('tenant_id', tenantId),

      // 5. Escalation counts by status
      supabase
        .from('escalations')
        .select('status')
        .eq('tenant_id', tenantId),

      // 6. Escalation resolution times
      supabase
        .from('escalations')
        .select('created_at, resolved_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'resolved')
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(50),

      // 7. Per-agent task counts (for agent-level metrics)
      supabase
        .from('tasks')
        .select('assignee_id, status, started_at, completed_at')
        .eq('tenant_id', tenantId)
        .not('assignee_id', 'is', null),
    ]);

    // Process task counts by status
    const taskStatusCounts: Record<string, number> = {};
    if (tasksByStatusResult.data) {
      for (const task of tasksByStatusResult.data) {
        taskStatusCounts[task.status] = (taskStatusCounts[task.status] || 0) + 1;
      }
    }

    const totalTasks = tasksByStatusResult.data?.length || 0;
    const completedTasks = taskStatusCounts['completed'] || 0;
    const failedTasks = taskStatusCounts['failed'] || 0;
    const inProgressTasks = taskStatusCounts['in_progress'] || 0;
    const queuedTasks = taskStatusCounts['queued'] || 0;
    const blockedTasks = taskStatusCounts['blocked'] || 0;
    const reviewTasks = taskStatusCounts['review'] || 0;

    // Calculate real average task duration (in seconds)
    let avgDurationSeconds = 0;
    if (taskDurationsResult.data && taskDurationsResult.data.length > 0) {
      const durations = taskDurationsResult.data.map(t => {
        const start = new Date(t.started_at).getTime();
        const end = new Date(t.completed_at).getTime();
        return (end - start) / 1000; // seconds
      });
      avgDurationSeconds = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    // Calculate tasks per hour from recent completions
    const recentCompletions = (recentTasksResult.data || []).filter(
      t => t.status === 'completed' && t.completed_at
    ).length;
    const tasksPerHour = recentCompletions; // Last hour window

    // Calculate success rate
    const finishedTasks = completedTasks + failedTasks;
    const successRate = finishedTasks > 0 ? (completedTasks / finishedTasks) * 100 : 100;

    // Process decision counts
    const decisionStatusCounts: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    if (decisionsResult.data) {
      for (const decision of decisionsResult.data) {
        decisionStatusCounts[decision.status] = (decisionStatusCounts[decision.status] || 0) + 1;
        // Extract confidence from reasoning JSONB
        const reasoning = decision.reasoning as Record<string, unknown> | null;
        if (reasoning && typeof reasoning.confidence === 'number') {
          totalConfidence += reasoning.confidence;
          confidenceCount++;
        }
      }
    }

    const totalDecisions = decisionsResult.data?.length || 0;
    const approvedDecisions = (decisionStatusCounts['approved'] || 0) + (decisionStatusCounts['executed'] || 0);
    const rejectedDecisions = (decisionStatusCounts['rejected'] || 0) + (decisionStatusCounts['overridden'] || 0);
    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Process escalation counts
    const escalationStatusCounts: Record<string, number> = {};
    if (escalationsResult.data) {
      for (const esc of escalationsResult.data) {
        escalationStatusCounts[esc.status] = (escalationStatusCounts[esc.status] || 0) + 1;
      }
    }

    const totalEscalations = escalationsResult.data?.length || 0;
    const openEscalations = (escalationStatusCounts['open'] || 0) + (escalationStatusCounts['in_progress'] || 0);
    const resolvedEscalations = escalationStatusCounts['resolved'] || 0;

    // Calculate average escalation resolution time (in minutes)
    let avgResolutionMinutes = 0;
    if (escalationResolutionResult.data && escalationResolutionResult.data.length > 0) {
      const resolutionTimes = escalationResolutionResult.data.map(e => {
        const created = new Date(e.created_at).getTime();
        const resolved = new Date(e.resolved_at).getTime();
        return (resolved - created) / (1000 * 60); // minutes
      });
      avgResolutionMinutes = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }

    // Build per-agent metrics
    const agentMetricsMap: Record<string, {
      completed: number;
      failed: number;
      inProgress: number;
      totalDurationSeconds: number;
      completedWithDuration: number;
    }> = {};

    if (agentTasksResult.data) {
      for (const task of agentTasksResult.data) {
        const agentId = task.assignee_id;
        if (!agentMetricsMap[agentId]) {
          agentMetricsMap[agentId] = {
            completed: 0,
            failed: 0,
            inProgress: 0,
            totalDurationSeconds: 0,
            completedWithDuration: 0,
          };
        }

        const metrics = agentMetricsMap[agentId];
        if (task.status === 'completed') {
          metrics.completed++;
          if (task.started_at && task.completed_at) {
            const duration = (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000;
            metrics.totalDurationSeconds += duration;
            metrics.completedWithDuration++;
          }
        } else if (task.status === 'failed') {
          metrics.failed++;
        } else if (task.status === 'in_progress') {
          metrics.inProgress++;
        }
      }
    }

    return NextResponse.json({
      data: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          failed: failedTasks,
          inProgress: inProgressTasks,
          queued: queuedTasks,
          blocked: blockedTasks,
          review: reviewTasks,
          successRate,
          avgDurationSeconds,
          tasksPerHour,
        },
        decisions: {
          total: totalDecisions,
          approved: approvedDecisions,
          rejected: rejectedDecisions,
          avgConfidence,
        },
        escalations: {
          total: totalEscalations,
          open: openEscalations,
          resolved: resolvedEscalations,
          avgResolutionMinutes,
        },
        agentMetrics: agentMetricsMap,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/realtime:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

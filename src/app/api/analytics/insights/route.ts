import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import type { AutomatedInsight, SmartAlert } from '@/types/advanced-analytics';

/**
 * GET /api/analytics/insights
 * Returns automated insights and smart alerts based on data patterns
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Fetch data for insight generation
    const [
      dailyMetrics,
      tasksResult,
      agentsResult,
      escalationsResult
    ] = await Promise.all([
      supabase
        .from('agent_performance_daily')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true }),
      
      supabase
        .from('tasks')
        .select('status, cost_usd, type, created_at, completed_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString()),
      
      supabase
        .from('agents')
        .select('id, name, role, status, created_at')
        .eq('tenant_id', tenantId),
      
      supabase
        .from('escalations')
        .select('status, urgency, created_at, resolved_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
    ]);

    // Generate insights
    const insights: AutomatedInsight[] = [];
    const alerts: SmartAlert[] = [];

    // Performance insights
    if (dailyMetrics.data) {
      const successRates = dailyMetrics.data.map(d => parseFloat(d.success_rate || '0'));
      const avgSuccess = successRates.reduce((a, b) => a + b, 0) / successRates.length;
      const recentSuccess = successRates.slice(-7).reduce((a, b) => a + b, 0) / 7;

      if (recentSuccess < avgSuccess * 0.9) {
        insights.push({
          id: 'insight-success-decline',
          category: 'performance',
          priority: 'high',
          title: 'Success Rate Declining',
          description: `Recent success rate (${(recentSuccess * 100).toFixed(1)}%) is below the ${days}-day average (${(avgSuccess * 100).toFixed(1)}%).`,
          metrics: [
            { label: 'Recent Avg', value: `${(recentSuccess * 100).toFixed(1)}%` },
            { label: 'Overall Avg', value: `${(avgSuccess * 100).toFixed(1)}%`, change: `-${((avgSuccess - recentSuccess) / avgSuccess * 100).toFixed(1)}%` }
          ],
          context: 'Performance degradation may indicate configuration issues or increased task complexity.',
          recommendation: 'Review recent task failures and agent configurations. Check for new error patterns.',
          createdAt: new Date().toISOString()
        });
      }

      // Cost trend insight
      const costs = dailyMetrics.data.map(d => parseFloat(d.total_cost_usd || '0'));
      const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
      const recentCost = costs.slice(-7).reduce((a, b) => a + b, 0) / 7;

      if (recentCost > avgCost * 1.2) {
        insights.push({
          id: 'insight-cost-increase',
          category: 'cost',
          priority: 'medium',
          title: 'Costs Trending Upward',
          description: `Average daily cost increased to $${recentCost.toFixed(2)} from $${avgCost.toFixed(2)}.`,
          metrics: [
            { label: 'Recent Avg', value: `$${recentCost.toFixed(2)}` },
            { label: 'Overall Avg', value: `$${avgCost.toFixed(2)}`, change: `+${((recentCost - avgCost) / avgCost * 100).toFixed(1)}%` }
          ],
          context: 'Cost increase may be due to more complex tasks or increased agent activity.',
          recommendation: 'Review task allocation and consider optimizing agent workflows.',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Task completion insights
    if (tasksResult.data) {
      const completed = tasksResult.data.filter(t => t.status === 'completed').length;
      const failed = tasksResult.data.filter(t => t.status === 'failed').length;
      const total = tasksResult.data.length;
      const completionRate = total > 0 ? completed / total : 0;

      if (completionRate < 0.7 && total > 10) {
        insights.push({
          id: 'insight-low-completion',
          category: 'bottleneck',
          priority: 'high',
          title: 'Low Task Completion Rate',
          description: `Only ${(completionRate * 100).toFixed(0)}% of tasks are being completed successfully.`,
          metrics: [
            { label: 'Completed', value: completed.toString() },
            { label: 'Failed', value: failed.toString() },
            { label: 'Total', value: total.toString() }
          ],
          context: 'Low completion rates may indicate resource constraints or task complexity issues.',
          recommendation: 'Investigate failed tasks and consider breaking complex tasks into smaller units.',
          createdAt: new Date().toISOString()
        });
      }

      // High-value task insight
      const expensiveTasks = tasksResult.data.filter(t => (t.cost_usd || 0) > 5);
      if (expensiveTasks.length > 3) {
        insights.push({
          id: 'insight-expensive-tasks',
          category: 'cost',
          priority: 'medium',
          title: 'High-Cost Tasks Detected',
          description: `${expensiveTasks.length} tasks exceeded $5 in costs.`,
          metrics: [
            { label: 'Expensive Tasks', value: expensiveTasks.length.toString() },
            { label: 'Avg Cost', value: `$${(expensiveTasks.reduce((sum, t) => sum + (t.cost_usd || 0), 0) / expensiveTasks.length).toFixed(2)}` }
          ],
          context: 'High-cost tasks may benefit from optimization or parallelization.',
          recommendation: 'Review expensive tasks for optimization opportunities.',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Agent insights
    if (agentsResult.data && agentsResult.data.length > 0) {
      const activeAgents = agentsResult.data.filter(a => a.status === 'active' || a.status === 'idle').length;
      const totalAgents = agentsResult.data.length;
      
      if (activeAgents < totalAgents * 0.5) {
        insights.push({
          id: 'insight-inactive-agents',
          category: 'opportunity',
          priority: 'low',
          title: 'Underutilized Agent Capacity',
          description: `Only ${activeAgents} of ${totalAgents} agents are currently active.`,
          metrics: [
            { label: 'Active', value: activeAgents.toString() },
            { label: 'Total', value: totalAgents.toString() }
          ],
          context: 'Inactive agents represent unused capacity that could handle more workload.',
          recommendation: 'Consider redistributing tasks to utilize all available agents.',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Escalation insights
    if (escalationsResult.data) {
      const openEscalations = escalationsResult.data.filter(e => e.status === 'open' || e.status === 'in_progress').length;
      const criticalEscalations = escalationsResult.data.filter(e => e.urgency === 'critical' && (e.status === 'open' || e.status === 'in_progress')).length;

      if (criticalEscalations > 0) {
        alerts.push({
          id: 'alert-critical-escalations',
          type: 'system',
          severity: 'critical',
          title: 'Critical Escalations Require Attention',
          message: `${criticalEscalations} critical escalation(s) are awaiting resolution.`,
          condition: 'critical_escalations > 0',
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
          actions: [
            { label: 'View Escalations', action: '/portal/escalations?urgency=critical' },
            { label: 'Acknowledge', action: 'acknowledge' }
          ]
        });
      }

      if (openEscalations > 5) {
        insights.push({
          id: 'insight-escalation-backlog',
          category: 'risk',
          priority: 'medium',
          title: 'Escalation Backlog Growing',
          description: `${openEscalations} escalations are currently open.`,
          metrics: [
            { label: 'Open', value: openEscalations.toString() },
            { label: 'Critical', value: criticalEscalations.toString() }
          ],
          context: 'Growing escalation backlog may indicate systemic issues requiring attention.',
          recommendation: 'Review escalation patterns and address root causes.',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Top performer insight
    if (dailyMetrics.data) {
      const agentPerformance: Record<string, { tasks: number; cost: number; name: string }> = {};
      
      dailyMetrics.data.forEach((d: any) => {
        if (!agentPerformance[d.agent_id]) {
          agentPerformance[d.agent_id] = { tasks: 0, cost: 0, name: d.agent_id };
        }
        agentPerformance[d.agent_id].tasks += d.tasks_completed || 0;
        agentPerformance[d.agent_id].cost += parseFloat(d.total_cost_usd || '0');
      });

      const topAgent = Object.entries(agentPerformance)
        .sort((a, b) => b[1].tasks - a[1].tasks)[0];

      if (topAgent && topAgent[1].tasks > 10) {
        insights.push({
          id: 'insight-top-performer',
          category: 'opportunity',
          priority: 'low',
          title: 'Top Performer Identified',
          description: `Agent ${topAgent[1].name} completed ${topAgent[1].tasks} tasks efficiently.`,
          metrics: [
            { label: 'Tasks Completed', value: topAgent[1].tasks.toString() },
            { label: 'Total Cost', value: `$${topAgent[1].cost.toFixed(2)}` }
          ],
          context: 'High-performing agents may have optimal configurations worth replicating.',
          recommendation: 'Analyze top performer configuration and apply learnings to other agents.',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Generate cost alert if projected to exceed threshold
    if (dailyMetrics.data) {
      const costs = dailyMetrics.data.map((d: any) => parseFloat(d.total_cost_usd || '0'));
      const avgDaily = costs.reduce((a: number, b: number) => a + b, 0) / costs.length;
      const projectedMonthly = avgDaily * 30;

      if (projectedMonthly > 100) {
        alerts.push({
          id: 'alert-cost-projection',
          type: 'cost',
          severity: 'warning',
          title: 'Monthly Cost Projection',
          message: `Projected monthly cost of $${projectedMonthly.toFixed(2)} exceeds $100 threshold.`,
          condition: 'projected_monthly_cost > 100',
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
          actions: [
            { label: 'Review Costs', action: '/portal/analytics?tab=cost' },
            { label: 'Optimize', action: '/portal/agents' }
          ]
        });
      }
    }

    return NextResponse.json({ 
      data: { 
        insights: insights.slice(0, 10), 
        alerts: alerts.slice(0, 5),
        generatedAt: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/insights/acknowledge
 * Acknowledge an alert
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }

    // In a real implementation, this would update a database
    // For now, we just return success
    return NextResponse.json({ 
      data: { acknowledged: true, alertId }
    });
  } catch (error) {
    console.error('Error in POST /api/analytics/insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import type { NLQueryResult, VisualizationRecommendation } from '@/types/advanced-analytics';

const querySchema = z.object({
  query: z.string().min(3),
  days: z.string().default('30'),
});

/**
 * POST /api/analytics/nlquery
 * Process natural language queries about analytics data
 * Uses pattern matching and intent detection (placeholder for LLM integration)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const body = await request.json();
    const validatedQuery = querySchema.parse(body);
    const { query, days } = validatedQuery;

    // Calculate date range
    const daysNum = parseInt(days);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysNum);

    // Parse intent from query
    const intent = parseIntent(query);
    
    // Fetch data based on intent
    let results: unknown = null;
    let summary = '';
    let recommendations: string[] = [];
    let visualizations: VisualizationRecommendation[] = [];

    switch (intent.type) {
      case 'agent_performance':
        const agentData = await fetchAgentPerformance(supabase, tenantId, startDate, intent.filters);
        results = agentData;
        summary = generateAgentSummary(agentData, intent.filters);
        recommendations = generateAgentRecommendations(agentData);
        visualizations = [
          { type: 'chart', title: 'Agent Performance Comparison', description: 'Tasks completed vs success rate', config: { type: 'bar', dataKey: 'successRate' } },
          { type: 'table', title: 'Agent Details', description: 'Detailed performance metrics', config: { columns: ['name', 'tasksCompleted', 'successRate', 'avgCost'] } }
        ];
        break;

      case 'cost_analysis':
        const costData = await fetchCostAnalysis(supabase, tenantId, startDate);
        results = costData;
        summary = generateCostSummary(costData);
        recommendations = generateCostRecommendations(costData);
        visualizations = [
          { type: 'chart', title: 'Cost Trend', description: 'Daily spending over time', config: { type: 'line', dataKey: 'cost' } },
          { type: 'chart', title: 'Cost Breakdown', description: 'By category', config: { type: 'pie', dataKey: 'category' } }
        ];
        break;

      case 'bottleneck_identification':
        const bottleneckData = await fetchBottlenecks(supabase, tenantId, startDate);
        results = bottleneckData;
        summary = generateBottleneckSummary(bottleneckData);
        recommendations = bottleneckData.map((b: { recommendation: string }) => b.recommendation);
        visualizations = [
          { type: 'chart', title: 'Pipeline Flow', description: 'Task flow through stages', config: { type: 'funnel' } },
          { type: 'table', title: 'Bottleneck Details', description: 'Tasks waiting by stage', config: {} }
        ];
        break;

      case 'task_analysis':
        const taskData = await fetchTaskAnalysis(supabase, tenantId, startDate, intent.filters);
        results = taskData;
        summary = generateTaskSummary(taskData);
        recommendations = generateTaskRecommendations(taskData);
        visualizations = [
          { type: 'chart', title: 'Task Status Distribution', description: 'Current task statuses', config: { type: 'pie' } },
          { type: 'chart', title: 'Completion Time Trend', description: 'Average completion time', config: { type: 'line' } }
        ];
        break;

      case 'trend_analysis':
        const trendData = await fetchTrendAnalysis(supabase, tenantId, startDate);
        results = trendData;
        summary = generateTrendSummary(trendData);
        recommendations = generateTrendRecommendations(trendData);
        visualizations = [
          { type: 'chart', title: 'Performance Trends', description: 'Key metrics over time', config: { type: 'line', multi: true } }
        ];
        break;

      default:
        // General query - fetch overview
        const overviewData = await fetchOverview(supabase, tenantId, startDate);
        results = overviewData;
        summary = `Here's an overview of your AI workforce activity over the last ${daysNum} days.`;
        recommendations = ['Explore specific agents for detailed metrics', 'Check cost trends for budget planning'];
        visualizations = [
          { type: 'metric', title: 'Key Metrics', description: 'Summary KPIs', config: {} },
          { type: 'chart', title: 'Activity Timeline', description: 'Events over time', config: { type: 'area' } }
        ];
    }

    const response: NLQueryResult = {
      query,
      intent: intent.type,
      filters: intent.filters,
      results,
      summary,
      recommendations,
      visualizations
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/analytics/nlquery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse intent from natural language query
 */
function parseIntent(query: string): { type: string; filters: Record<string, unknown> } {
  const lowerQuery = query.toLowerCase();
  const filters: Record<string, unknown> = {};

  // Agent performance queries
  if (lowerQuery.includes('agent') && (
    lowerQuery.includes('performance') || 
    lowerQuery.includes('top') || 
    lowerQuery.includes('best') ||
    lowerQuery.includes('worst') ||
    lowerQuery.includes('compare')
  )) {
    if (lowerQuery.includes('declining')) {
      filters.trend = 'declining';
    }
    if (lowerQuery.includes('top') || lowerQuery.includes('best')) {
      filters.sortBy = 'successRate';
      filters.order = 'desc';
    }
    if (lowerQuery.includes('worst') || lowerQuery.includes('bottom')) {
      filters.sortBy = 'successRate';
      filters.order = 'asc';
    }
    return { type: 'agent_performance', filters };
  }

  // Cost analysis queries
  if (lowerQuery.includes('cost') || lowerQuery.includes('spend') || lowerQuery.includes('money') || lowerQuery.includes('budget')) {
    if (lowerQuery.includes('agent')) {
      filters.groupBy = 'agent';
    }
    if (lowerQuery.includes('trend')) {
      filters.includeTrend = true;
    }
    return { type: 'cost_analysis', filters };
  }

  // Bottleneck queries
  if (lowerQuery.includes('bottleneck') || lowerQuery.includes('stuck') || lowerQuery.includes('slow') || lowerQuery.includes('block')) {
    return { type: 'bottleneck_identification', filters };
  }

  // Task analysis queries
  if (lowerQuery.includes('task') && (
    lowerQuery.includes('complete') || 
    lowerQuery.includes('failed') || 
    lowerQuery.includes('status')
  )) {
    if (lowerQuery.includes('failed')) {
      filters.status = 'failed';
    }
    if (lowerQuery.includes('completed') || lowerQuery.includes('done')) {
      filters.status = 'completed';
    }
    return { type: 'task_analysis', filters };
  }

  // Trend analysis
  if (lowerQuery.includes('trend') || lowerQuery.includes('over time') || lowerQuery.includes('histor')) {
    return { type: 'trend_analysis', filters };
  }

  return { type: 'general', filters };
}

// Data fetching functions
async function fetchAgentPerformance(supabase: any, tenantId: string, startDate: Date, filters: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('agent_performance_daily')
    .select(`
      agent_id,
      agents:agent_id(name, role),
      tasks_completed,
      tasks_failed,
      success_rate,
      total_cost_usd,
      avg_task_duration_seconds
    `)
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) throw error;

  // Aggregate by agent
  const agentMap = new Map();
  data?.forEach((row: any) => {
    if (!agentMap.has(row.agent_id)) {
      agentMap.set(row.agent_id, {
        agentId: row.agent_id,
        name: row.agents?.name || 'Unknown',
        role: row.agents?.role || 'unknown',
        tasksCompleted: 0,
        tasksFailed: 0,
        totalCost: 0,
        successRates: [],
        durations: []
      });
    }
    const agent = agentMap.get(row.agent_id);
    agent.tasksCompleted += row.tasks_completed || 0;
    agent.tasksFailed += row.tasks_failed || 0;
    agent.totalCost += parseFloat(row.total_cost_usd || '0');
    agent.successRates.push(parseFloat(row.success_rate || '0'));
    agent.durations.push(row.avg_task_duration_seconds || 0);
  });

  return Array.from(agentMap.values()).map((agent: any) => ({
    ...agent,
    successRate: agent.successRates.length > 0 
      ? agent.successRates.reduce((a: number, b: number) => a + b, 0) / agent.successRates.length 
      : 0,
    avgDuration: agent.durations.length > 0
      ? agent.durations.reduce((a: number, b: number) => a + b, 0) / agent.durations.length
      : 0
  }));
}

async function fetchCostAnalysis(supabase: any, tenantId: string, startDate: Date) {
  const { data, error } = await supabase
    .from('agent_performance_daily')
    .select('date, total_cost_usd, tasks_completed')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchBottlenecks(supabase: any, tenantId: string, startDate: Date) {
  // Get current task pipeline snapshot
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('status, count')
    .eq('tenant_id', tenantId)
    .in('status', ['queued', 'in_progress', 'blocked', 'review']);

  if (error) throw error;

  const statusCounts: Record<string, number> = {};
  tasks?.forEach((t: any) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const bottlenecks = [];
  if (statusCounts['blocked'] > 5) {
    bottlenecks.push({
      type: 'blocked_tasks',
      description: `${statusCounts['blocked']} tasks are currently blocked`,
      severity: statusCounts['blocked'] > 10 ? 'high' : 'medium',
      recommendation: 'Review dependencies and unblock critical tasks'
    });
  }
  if (statusCounts['queued'] > 20) {
    bottlenecks.push({
      type: 'queue_backlog',
      description: `${statusCounts['queued']} tasks waiting in queue`,
      severity: statusCounts['queued'] > 50 ? 'high' : 'medium',
      recommendation: 'Consider spawning additional worker agents'
    });
  }

  return bottlenecks;
}

async function fetchTaskAnalysis(supabase: any, tenantId: string, startDate: Date, filters: Record<string, unknown>) {
  let query = supabase
    .from('tasks')
    .select('id, title, status, type, priority, cost_usd, started_at, completed_at, assignee_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString());

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchTrendAnalysis(supabase: any, tenantId: string, startDate: Date) {
  const { data, error } = await supabase
    .from('agent_performance_daily')
    .select('date, tasks_completed, tasks_failed, total_cost_usd, success_rate')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchOverview(supabase: any, tenantId: string, startDate: Date) {
  const [
    tasksResult,
    agentsResult,
    decisionsResult,
    escalationsResult
  ] = await Promise.all([
    supabase.from('tasks').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
    supabase.from('agents').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
    supabase.from('decisions').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
    supabase.from('escalations').select('status', { count: 'exact' }).eq('tenant_id', tenantId)
  ]);

  return {
    tasks: tasksResult.count,
    agents: agentsResult.count,
    decisions: decisionsResult.count,
    escalations: escalationsResult.count
  };
}

// Summary generation functions
function generateAgentSummary(data: any[], filters: Record<string, unknown>): string {
  if (data.length === 0) return 'No agent data found for the specified period.';
  
  const avgSuccess = data.reduce((sum, a) => sum + a.successRate, 0) / data.length;
  const topAgent = data.reduce((best, a) => a.successRate > best.successRate ? a : best, data[0]);
  
  let summary = `Found ${data.length} agents with an average success rate of ${(avgSuccess * 100).toFixed(1)}%. `;
  summary += `${topAgent.name} is your top performer with a ${(topAgent.successRate * 100).toFixed(1)}% success rate.`;
  
  if (filters.trend === 'declining') {
    const declining = data.filter(a => a.successRate < 0.7);
    if (declining.length > 0) {
      summary += ` ${declining.length} agents show declining performance and may need attention.`;
    }
  }
  
  return summary;
}

function generateAgentRecommendations(data: any[]): string[] {
  const recommendations = [];
  const lowPerformers = data.filter(a => a.successRate < 0.6);
  const highCost = data.filter(a => a.totalCost > 10);
  
  if (lowPerformers.length > 0) {
    recommendations.push(`${lowPerformers.length} agents have success rates below 60%. Consider reviewing their configuration.`);
  }
  if (highCost.length > 0) {
    recommendations.push(`${highCost.length} agents have high costs. Review task allocation for optimization.`);
  }
  if (data.some(a => a.avgDuration > 3600)) {
    recommendations.push('Some agents are taking over an hour per task. Consider breaking tasks into smaller units.');
  }
  
  return recommendations.length > 0 ? recommendations : ['All agents are performing within expected parameters.'];
}

function generateCostSummary(data: any[]): string {
  if (data.length === 0) return 'No cost data available.';
  
  const totalCost = data.reduce((sum, d) => sum + parseFloat(d.total_cost_usd || '0'), 0);
  const avgDaily = totalCost / data.length;
  
  return `Total spend of $${totalCost.toFixed(2)} over ${data.length} days, averaging $${avgDaily.toFixed(2)} per day.`;
}

function generateCostRecommendations(data: any[]): string[] {
  const costs = data.map(d => parseFloat(d.total_cost_usd || '0'));
  const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
  const recentCosts = costs.slice(-7);
  const recentAvg = recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;
  
  if (recentAvg > avgCost * 1.2) {
    return ['Costs are trending upward. Review agent task allocation to optimize spending.'];
  }
  if (recentAvg < avgCost * 0.8) {
    return ['Costs are decreasing. Good job on optimization!'];
  }
  return ['Cost trends are stable.'];
}

function generateBottleneckSummary(data: any[]): string {
  if (data.length === 0) return 'No significant bottlenecks detected.';
  return `Found ${data.length} potential bottlenecks in your workflow.`;
}

function generateTaskSummary(data: any[]): string {
  if (data.length === 0) return 'No tasks found matching your criteria.';
  return `Found ${data.length} tasks. Use the visualizations to explore further.`;
}

function generateTaskRecommendations(data: any[]): string[] {
  const failed = data.filter(t => t.status === 'failed');
  if (failed.length > 0) {
    return [`${failed.length} tasks failed. Review error patterns and agent configurations.`];
  }
  return [];
}

function generateTrendSummary(data: any[]): string {
  if (data.length === 0) return 'No trend data available.';
  return `Analyzed ${data.length} days of performance data.`;
}

function generateTrendRecommendations(data: any[]): string[] {
  return ['Review the trend charts to identify patterns and optimize your workflows.'];
}

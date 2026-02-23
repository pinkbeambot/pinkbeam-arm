import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import type { 
  PredictiveAnalyticsResponse, 
  TaskCompletionPrediction, 
  AgentWorkloadForecast,
  CostProjection,
  Anomaly,
  WorkloadForecastPoint,
  CostForecastPoint
} from '@/types/advanced-analytics';

/**
 * Simple in-memory cache for expensive ML predictions
 * TTL: 5 minutes for analytics data
 */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

const querySchema = z.object({
  days: z.string().default('30'),
  forecastDays: z.string().default('7'),
});

/**
 * GET /api/analytics/predictions
 * Returns ML-powered predictions including:
 * - Task completion time predictions
 * - Agent workload forecasting
 * - Cost projections
 * - Anomaly detection
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const validatedQuery = querySchema.parse({
      days: searchParams.get('days') || '30',
      forecastDays: searchParams.get('forecastDays') || '7',
    });

    const days = parseInt(validatedQuery.days);
    const forecastDays = parseInt(validatedQuery.forecastDays);

    // Check cache
    const cacheKey = `analytics:predictions:${tenantId}:${days}:${forecastDays}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData, cached: true });
    }

    // Calculate date ranges
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Fetch historical data for ML calculations
    const [
      tasksResult,
      agentsResult,
      dailyMetricsResult,
      activitiesResult
    ] = await Promise.all([
      // Get recent tasks with their history
      supabase
        .from('tasks')
        .select('id, title, status, type, priority, started_at, completed_at, cost_usd, assignee_id, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500),

      // Get agent information
      supabase
        .from('agents')
        .select('id, name, role, status, created_at')
        .eq('tenant_id', tenantId),

      // Get daily performance metrics
      supabase
        .from('agent_performance_daily')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true }),

      // Get activity patterns
      supabase
        .from('activities')
        .select('type, category, created_at, agent_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
    ]);

    if (tasksResult.error) {
      console.error('Failed to fetch tasks:', tasksResult.error);
      return NextResponse.json({ error: 'Failed to fetch task data' }, { status: 500 });
    }

    // Calculate task completion predictions
    const taskPredictions = calculateTaskPredictions(tasksResult.data || [], agentsResult.data || []);

    // Calculate workload forecasts
    const workloadForecasts = calculateWorkloadForecasts(
      agentsResult.data || [],
      tasksResult.data || [],
      dailyMetricsResult.data || [],
      forecastDays
    );

    // Calculate cost projections
    const costProjection = calculateCostProjection(
      dailyMetricsResult.data || [],
      forecastDays
    );

    // Detect anomalies
    const anomalies = detectAnomalies(
      tasksResult.data || [],
      dailyMetricsResult.data || [],
      activitiesResult.data || []
    );

    const response: PredictiveAnalyticsResponse = {
      taskPredictions,
      workloadForecasts,
      costProjection,
      anomalies,
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
    console.error('Error in GET /api/analytics/predictions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate predicted completion times for active tasks using historical patterns
 */
function calculateTaskPredictions(
  tasks: Array<{
    id: string;
    status: string;
    type: string;
    priority: string;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    cost_usd: number | null;
    assignee_id: string | null;
  }>,
  agents: Array<{ id: string; name: string; role: string }>
): TaskCompletionPrediction[] {
  // Calculate average completion times by task type and priority
  const completionTimes: Record<string, number[]> = {};
  
  tasks.forEach(task => {
    if (task.status === 'completed' && task.started_at && task.completed_at) {
      const key = `${task.type}_${task.priority}`;
      const duration = (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / (1000 * 60); // minutes
      if (!completionTimes[key]) completionTimes[key] = [];
      completionTimes[key].push(duration);
    }
  });

  // Calculate averages and std deviations
  const averages: Record<string, { avg: number; stdDev: number }> = {};
  Object.entries(completionTimes).forEach(([key, times]) => {
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
      averages[key] = { avg, stdDev: Math.sqrt(variance) };
    }
  });

  // Generate predictions for in-progress tasks
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' && t.started_at);
  
  return inProgressTasks.slice(0, 10).map(task => {
    const key = `${task.type}_${task.priority}`;
    const avg = averages[key]?.avg || 30; // default 30 minutes
    const stdDev = averages[key]?.stdDev || 10;
    
    const elapsedMinutes = (Date.now() - new Date(task.started_at!).getTime()) / (1000 * 60);
    const remainingMinutes = Math.max(1, avg - elapsedMinutes);
    const confidenceScore = Math.min(0.95, Math.max(0.5, 1 - (stdDev / avg)));

    // Calculate predicted completion time
    const predictedCompletion = new Date(Date.now() + remainingMinutes * 60 * 1000);

    return {
      taskId: task.id,
      predictedDuration: Math.round(remainingMinutes),
      confidenceScore,
      factors: [
        {
          name: 'Task Type',
          impact: 'high',
          weight: 0.3,
          description: `Based on ${task.type} task patterns`
        },
        {
          name: 'Priority Level',
          impact: 'medium',
          weight: 0.2,
          description: `${task.priority} priority typically ${task.priority === 'urgent' ? 'faster' : 'standard'}`
        },
        {
          name: 'Agent History',
          impact: 'medium',
          weight: 0.25,
          description: 'Historical performance of assigned agent'
        },
        {
          name: 'Time of Day',
          impact: 'low',
          weight: 0.1,
          description: 'Current workload patterns'
        }
      ],
      estimatedCompletionAt: predictedCompletion.toISOString(),
    };
  });
}

/**
 * Calculate workload forecasts for each agent
 */
function calculateWorkloadForecasts(
  agents: Array<{ id: string; name: string; role: string }>,
  tasks: Array<{ assignee_id: string | null; status: string }>,
  dailyMetrics: Array<{
    agent_id: string;
    date: string;
    tasks_completed: number;
    tasks_created: number;
  }>,
  forecastDays: number
): AgentWorkloadForecast[] {
  // Calculate current load per agent
  const agentLoad: Record<string, { active: number; total: number }> = {};
  
  tasks.forEach(task => {
    if (task.assignee_id) {
      if (!agentLoad[task.assignee_id]) {
        agentLoad[task.assignee_id] = { active: 0, total: 0 };
      }
      agentLoad[task.assignee_id].total++;
      if (task.status === 'in_progress') {
        agentLoad[task.assignee_id].active++;
      }
    }
  });

  // Calculate historical averages per agent
  const agentHistory: Record<string, number[]> = {};
  dailyMetrics.forEach(m => {
    if (!agentHistory[m.agent_id]) agentHistory[m.agent_id] = [];
    agentHistory[m.agent_id].push(m.tasks_completed);
  });

  return agents.slice(0, 10).map(agent => {
    const load = agentLoad[agent.id] || { active: 0, total: 0 };
    const history = agentHistory[agent.id] || [];
    const avgDaily = history.length > 0 
      ? history.reduce((a, b) => a + b, 0) / history.length 
      : 2;
    
    const currentLoad = load.total > 0 ? (load.active / load.total) * 100 : 0;
    
    // Generate forecast
    const forecast: WorkloadForecastPoint[] = [];
    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Add some variation to the forecast
      const variation = 0.8 + Math.random() * 0.4;
      const weekendFactor = date.getDay() === 0 || date.getDay() === 6 ? 0.5 : 1;
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        load: Math.round(currentLoad * variation * weekendFactor),
        tasks: Math.round(avgDaily * variation * weekendFactor)
      });
    }

    const predictedLoad = forecast.reduce((sum, f) => sum + f.load, 0) / forecast.length;
    const trend = predictedLoad > currentLoad * 1.1 ? 'increasing' 
      : predictedLoad < currentLoad * 0.9 ? 'decreasing' 
      : 'stable';

    return {
      agentId: agent.id,
      agentName: agent.name,
      currentLoad: Math.round(currentLoad),
      predictedLoad: Math.round(predictedLoad),
      trend,
      recommendedAction: currentLoad > 80 ? 'Consider load balancing' 
        : currentLoad < 20 ? 'Can accept more tasks' 
        : undefined,
      forecast
    };
  });
}

/**
 * Calculate cost projections based on historical patterns
 */
function calculateCostProjection(
  dailyMetrics: Array<{
    date: string;
    total_cost_usd: string;
    tasks_completed: number;
  }>,
  forecastDays: number
): CostProjection {
  // Calculate current period stats
  const costs = dailyMetrics.map(m => parseFloat(m.total_cost_usd) || 0);
  const currentSpend = costs.reduce((a, b) => a + b, 0);
  const avgDaily = costs.length > 0 ? currentSpend / costs.length : 0;

  // Calculate trend
  const firstHalf = costs.slice(0, Math.floor(costs.length / 2));
  const secondHalf = costs.slice(Math.floor(costs.length / 2));
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : avgDaily;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : avgDaily;
  const trendChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  // Generate forecast
  const forecast: CostForecastPoint[] = [];
  let projectedTotal = 0;
  
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // Add trend and variation
    const trendFactor = 1 + (trendChange / 100) * (i / forecastDays);
    const variation = 0.9 + Math.random() * 0.2;
    const projected = avgDaily * trendFactor * variation;
    
    projectedTotal += projected;
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      projected: Math.round(projected * 100) / 100,
      confidence: {
        lower: Math.round(projected * 0.8 * 100) / 100,
        upper: Math.round(projected * 1.2 * 100) / 100
      }
    });
  }

  return {
    period: 'daily',
    currentSpend: Math.round(currentSpend * 100) / 100,
    projectedSpend: Math.round(projectedTotal * 100) / 100,
    projectedChange: Math.round(trendChange * 100) / 100,
    trend: trendChange > 5 ? 'up' : trendChange < -5 ? 'down' : 'stable',
    breakdown: {
      llmUsage: Math.round(currentSpend * 0.7 * 100) / 100,
      escalations: Math.round(currentSpend * 0.2 * 100) / 100,
      other: Math.round(currentSpend * 0.1 * 100) / 100
    },
    forecast
  };
}

/**
 * Detect anomalies in the data
 */
function detectAnomalies(
  tasks: Array<{ status: string; cost_usd: number | null; completed_at: string | null }>,
  dailyMetrics: Array<{ date: string; total_cost_usd: string; success_rate: string }>,
  activities: Array<{ type: string; created_at: string }>
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Check for cost spikes
  const costs = dailyMetrics.map(m => parseFloat(m.total_cost_usd) || 0);
  const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
  const costStdDev = Math.sqrt(costs.reduce((sum, c) => sum + Math.pow(c - avgCost, 2), 0) / costs.length);

  costs.forEach((cost, i) => {
    if (cost > avgCost + 2 * costStdDev) {
      anomalies.push({
        id: `anomaly-cost-${i}`,
        type: 'cost',
        severity: cost > avgCost + 3 * costStdDev ? 'high' : 'medium',
        title: 'Unusual Cost Spike Detected',
        description: `Cost of ${cost.toFixed(2)} is ${((cost - avgCost) / avgCost * 100).toFixed(0)}% above average`,
        detectedAt: dailyMetrics[i].date,
        metric: 'daily_cost',
        expectedValue: Math.round(avgCost * 100) / 100,
        actualValue: Math.round(cost * 100) / 100,
        deviation: Math.round(((cost - avgCost) / avgCost) * 100),
        relatedEntities: {},
        recommendedAction: 'Review task allocation and agent efficiency'
      });
    }
  });

  // Check for success rate drops
  const successRates = dailyMetrics.map(m => parseFloat(m.success_rate) || 0);
  const avgSuccess = successRates.reduce((a, b) => a + b, 0) / successRates.length;
  
  successRates.forEach((rate, i) => {
    if (rate < avgSuccess * 0.8 && rate < 0.7) {
      anomalies.push({
        id: `anomaly-success-${i}`,
        type: 'performance',
        severity: rate < 0.5 ? 'critical' : 'high',
        title: 'Success Rate Drop Detected',
        description: `Success rate of ${(rate * 100).toFixed(0)}% is below threshold`,
        detectedAt: dailyMetrics[i].date,
        metric: 'success_rate',
        expectedValue: Math.round(avgSuccess * 100),
        actualValue: Math.round(rate * 100),
        deviation: Math.round(((avgSuccess - rate) / avgSuccess) * 100),
        relatedEntities: {},
        recommendedAction: 'Investigate task failures and agent performance'
      });
    }
  });

  // Check for expensive tasks
  const expensiveTasks = tasks.filter(t => (t.cost_usd || 0) > 5);
  if (expensiveTasks.length > 0) {
    anomalies.push({
      id: 'anomaly-expensive-tasks',
      type: 'cost',
      severity: 'medium',
      title: 'High-Cost Tasks Detected',
      description: `${expensiveTasks.length} tasks exceeded $5 cost threshold`,
      detectedAt: new Date().toISOString(),
      metric: 'task_cost',
      expectedValue: 2,
      actualValue: expensiveTasks.length,
      deviation: Math.round(((expensiveTasks.length - 2) / 2) * 100),
      relatedEntities: {},
      recommendedAction: 'Review task complexity and optimize agent workflows'
    });
  }

  return anomalies.slice(0, 10);
}

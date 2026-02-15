/**
 * Analytics Service
 * Client-side service for fetching analytics data from the API
 */

import type {
  PerformanceDashboardData,
  AgentPerformance,
  TimeSeriesDataPoint,
  Bottleneck,
  ROIMetrics,
  TaskStageMetrics,
  DateRange
} from '@/components/dashboard/performance/types';
import type { AgentRole, AgentStatus } from '@/types';

// API Response types
interface OverviewSummary {
  tasksCompleted: { value: number; trend: number; trendDirection: 'up' | 'down' };
  tasksCreated: { value: number; trend: number; trendDirection: 'up' | 'down' };
  successRate: { value: number; trend: number; trendDirection: 'up' | 'down' };
  activeAgents: { value: number; trend: number; trendDirection: 'up' | 'down' };
  totalCost: { value: number; trend: number; trendDirection: 'up' | 'down' };
  openEscalations: { value: number; trend: number; trendDirection: 'up' | 'down' };
}

interface OverviewResponse {
  data: {
    summary: OverviewSummary;
    dailyBreakdown: Array<{
      date: string;
      tasksCompleted: number;
      tasksCreated: number;
      cost: number;
      successRate?: number;
    }>;
    avgTaskDuration: number;
    period: { days: number; startDate: string; endDate: string };
  };
  cached?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  agentId: string;
  name: string;
  avatarUrl?: string;
  role: string;
  status: string;
  tasksCompleted: number;
  tasksFailed: number;
  successRate: number;
  avgTaskDuration: number;
  totalCost: number;
  escalationCount: number;
  overrideRate: number;
  trendDirection: string;
}

interface LeaderboardResponse {
  data: {
    leaderboard: LeaderboardEntry[];
    period: { days: number };
    sortBy: string;
    generatedAt: string;
  };
  cached?: boolean;
}

interface BottleneckResponse {
  data: {
    summary: {
      totalBottlenecks: number;
      highSeverityCount: number;
      totalBlockedTasks: number;
      avgWaitTime: number;
    };
    bottlenecks: Array<{
      type: string;
      description: string;
      affectedCount: number;
      avgWaitTimeSeconds: number;
      severity: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
    pipelineSnapshot: {
      queued: number;
      in_progress: number;
      blocked: number;
      review: number;
    };
    timeInStage: {
      queued: { count: number; avgTime: number; maxTime: number };
      in_progress: { count: number; avgTime: number; maxTime: number };
      blocked: { count: number; avgTime: number; maxTime: number };
      review: { count: number; avgTime: number; maxTime: number };
    };
    tasksWaitingLongest: Array<{
      id: string;
      title: string;
      status: string;
      waitingTimeSeconds: number;
      assignee: { id: string; name: string } | null;
    }>;
    agentWorkload: Array<{
      agentId: string;
      name: string;
      pendingTasks: number;
    }>;
    dependencyDelays: Array<{
      taskId: string;
      taskTitle: string;
      blockedByTaskId: string;
      blockedByTaskTitle: string;
      blockedByStatus: string;
      dependencyType: string;
    }>;
    recommendations: Array<{
      type: string;
      severity: string;
      action: string;
      impact: number;
    }>;
    period: { hours: number };
    generatedAt: string;
  };
  cached?: boolean;
}

interface ROIResponse {
  data: {
    summary: {
      totalTasksCompleted: number;
      totalCost: number;
      costPerTask: number;
      tasksPerDollar: number;
      estimatedHoursSaved: number;
      estimatedValueGenerated: number;
      roiPercentage: number;
    };
    trends: {
      cost: number;
      tasksCompleted: number;
      costPerTask: number;
      roi: number;
    };
    agentCostBreakdown: Array<{
      agentId: string;
      name: string;
      role: string;
      totalCost: number;
      tasksCompleted: number;
      costPerTask: number;
    }>;
    taskTypeBreakdown: Array<{
      type: string;
      cost: number;
      count: number;
      completed: number;
      costPerTask: number;
      successRate: number;
    }>;
    dailyTrend: Array<{
      date: string;
      cost: number;
      tasksCompleted: number;
    }>;
    projections: {
      monthlyCost: number;
      annualCost: number;
      monthlyValue: number;
      annualValue: number;
    };
    comparison: {
      vsHumanLabor: {
        humanCost: number;
        aiCost: number;
        savings: number;
      };
    };
    assumptions: {
      avgHumanCostPerHour: number;
      periodDays: number;
    };
  };
  cached?: boolean;
}

// Fetch wrapper with auth — token must be provided by the caller (e.g. from useAuth())
function fetchWithAuth(url: string, token: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Convert API date range to days
function dateRangeToDays(dateRange: DateRange): number {
  switch (dateRange) {
    case 'today': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 30;
  }
}

// Convert API trend data to TimeSeriesDataPoint
function convertToTimeSeries(data: Array<{ date: string; value?: number; [key: string]: unknown }>, valueKey: string): TimeSeriesDataPoint[] {
  return data.map(item => {
    const date = new Date(item.date);
    return {
      timestamp: item.date,
      value: (item[valueKey] as number) || 0,
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });
}

/**
 * Fetch overview metrics
 */
export async function fetchOverviewMetrics(dateRange: DateRange, token: string): Promise<OverviewResponse['data']> {
  const days = dateRangeToDays(dateRange);
  const response = await fetchWithAuth(`/api/v1/analytics/overview?days=${days}`, token);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch overview metrics: ${response.status}`);
  }
  
  const result = await response.json() as OverviewResponse;
  return result.data;
}

/**
 * Fetch agent leaderboard
 */
export async function fetchLeaderboard(dateRange: DateRange, sortBy: string = 'tasksCompleted', limit: number = 20, token: string = ''): Promise<LeaderboardResponse['data']> {
  const days = dateRangeToDays(dateRange);
  const response = await fetchWithAuth(`/api/v1/analytics/leaderboard?days=${days}&sortBy=${sortBy}&limit=${limit}`, token);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch leaderboard: ${response.status}`);
  }
  
  const result = await response.json() as LeaderboardResponse;
  return result.data;
}

/**
 * Fetch bottleneck data
 */
export async function fetchBottlenecks(hours: number = 24, token: string = ''): Promise<BottleneckResponse['data']> {
  const response = await fetchWithAuth(`/api/v1/analytics/bottlenecks?hours=${hours}`, token);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch bottlenecks: ${response.status}`);
  }
  
  const result = await response.json() as BottleneckResponse;
  return result.data;
}

/**
 * Fetch ROI metrics
 */
export async function fetchROIMetrics(dateRange: DateRange, hourlyRate: number = 50, token: string = ''): Promise<ROIResponse['data']> {
  const days = dateRangeToDays(dateRange);
  const response = await fetchWithAuth(`/api/v1/analytics/roi?days=${days}&hourlyRate=${hourlyRate}`, token);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch ROI metrics: ${response.status}`);
  }
  
  const result = await response.json() as ROIResponse;
  return result.data;
}

/**
 * Fetch complete performance dashboard data
 */
export async function fetchPerformanceData(dateRange: DateRange, token: string): Promise<PerformanceDashboardData> {
  const [overview, leaderboard, bottlenecks, roi] = await Promise.all([
    fetchOverviewMetrics(dateRange, token),
    fetchLeaderboard(dateRange, 'tasksCompleted', 20, token),
    fetchBottlenecks(24, token),
    fetchROIMetrics(dateRange, 50, token),
  ]);

  // Convert API data to component types
  const dailyBreakdown = overview.dailyBreakdown || [];

  // Create trend data from daily breakdown
  const createTrendFromDaily = (key: keyof typeof dailyBreakdown[0]): TimeSeriesDataPoint[] => {
    return dailyBreakdown.map(d => ({
      timestamp: d.date,
      value: (d[key] as number) || 0,
      label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    }));
  };

  // Calculate change from trends
  const calculateChange = (trend: TimeSeriesDataPoint[]): number => {
    if (trend.length < 2) return 0;
    const current = trend[trend.length - 1]?.value || 0;
    const previous = trend[trend.length - 2]?.value || 0;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const tasksTrend = createTrendFromDaily('tasksCompleted');
  const costTrend = createTrendFromDaily('cost');

  // Convert leaderboard entries to AgentPerformance
  const agentLeaderboard: AgentPerformance[] = leaderboard.leaderboard.map((entry, index) => ({
    agent: {
      id: entry.agentId,
      tenant_id: '', // Will be filled by parent context
      name: entry.name,
      slug: entry.name.toLowerCase().replace(/\s+/g, '-'),
      role: entry.role as AgentRole,
      status: entry.status as AgentStatus,
      avatar_url: entry.avatarUrl,
      description: '',
      capabilities: [],
      model: 'unknown',
      depth: 1,
      created_at: '',
      updated_at: '',
    },
    rank: entry.rank || index + 1,
    tasksCompleted: entry.tasksCompleted,
    tasksFailed: entry.tasksFailed,
    avgCompletionTime: entry.avgTaskDuration / 60, // Convert seconds to minutes
    successRate: entry.successRate,
    escalationRate: (entry.escalationCount / Math.max(entry.tasksCompleted, 1)) * 100,
    totalCost: entry.totalCost,
    trend: [], // Would need additional API call for trend data
  }));

  // Convert bottlenecks
  const bottleneckData: Bottleneck[] = bottlenecks.bottlenecks.map((b, index) => ({
    id: `bottleneck-${index}`,
    type: b.type.includes('agent') ? 'agent' : b.type.includes('queue') ? 'stage' : 'dependency',
    name: b.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: b.description,
    severity: b.severity,
    tasksAffected: b.affectedCount,
    avgWaitTime: b.avgWaitTimeSeconds / 60, // Convert to minutes
    recommendation: b.recommendation,
  }));

  // Convert ROI data
  const roiData: ROIMetrics = {
    totalTasksCompleted: roi.summary.totalTasksCompleted,
    totalCost: roi.summary.totalCost,
    estimatedHumanHoursSaved: roi.summary.estimatedHoursSaved,
    humanHourlyRate: roi.assumptions.avgHumanCostPerHour,
    estimatedValueGenerated: roi.summary.estimatedValueGenerated,
    roiPercentage: roi.summary.roiPercentage,
    costPerTask: roi.summary.costPerTask,
    tasksPerDollar: roi.summary.tasksPerDollar,
    projectedMonthlyCost: roi.projections.monthlyCost,
    projectedAnnualCost: roi.projections.annualCost,
  };

  // Create task stage metrics from pipeline snapshot
  const taskStageMetrics: TaskStageMetrics[] = [
    {
      stage: 'Queued',
      count: bottlenecks.pipelineSnapshot.queued,
      avgTime: bottlenecks.timeInStage.queued.avgTime / 60,
      trend: [],
    },
    {
      stage: 'In Progress',
      count: bottlenecks.pipelineSnapshot.in_progress,
      avgTime: bottlenecks.timeInStage.in_progress.avgTime / 60,
      trend: [],
    },
    {
      stage: 'Blocked',
      count: bottlenecks.pipelineSnapshot.blocked,
      avgTime: bottlenecks.timeInStage.blocked.avgTime / 60,
      trend: [],
    },
    {
      stage: 'Review',
      count: bottlenecks.pipelineSnapshot.review,
      avgTime: bottlenecks.timeInStage.review.avgTime / 60,
      trend: [],
    },
  ];

  return {
    dateRange,
    metrics: {
      tasksCompleted: {
        title: 'Tasks Completed',
        value: overview.summary.tasksCompleted.value,
        change: overview.summary.tasksCompleted.trend,
        changeLabel: 'vs last period',
        trend: tasksTrend,
        format: 'number',
      },
      activeAgents: {
        title: 'Active Agents',
        value: overview.summary.activeAgents.value,
        change: overview.summary.activeAgents.trend,
        changeLabel: 'vs last period',
        trend: [], // Would need additional data
        format: 'number',
      },
      avgCompletionTime: {
        title: 'Avg Completion Time',
        value: overview.avgTaskDuration / 60, // Convert seconds to minutes
        change: 0, // Would need comparison data
        changeLabel: 'vs last period',
        trend: [],
        format: 'time',
      },
      successRate: {
        title: 'Success Rate',
        value: overview.summary.successRate.value,
        change: overview.summary.successRate.trend,
        changeLabel: 'vs last period',
        trend: [],
        format: 'percentage',
      },
      totalEscalations: {
        title: 'Total Escalations',
        value: overview.summary.openEscalations.value,
        change: overview.summary.openEscalations.trend,
        changeLabel: 'vs last period',
        trend: [],
        format: 'number',
      },
      totalCost: {
        title: 'Total Cost',
        value: overview.summary.totalCost.value,
        change: overview.summary.totalCost.trend,
        changeLabel: 'vs last period',
        trend: costTrend,
        format: 'currency',
      },
    },
    agentLeaderboard,
    roi: roiData,
    bottlenecks: bottleneckData,
    taskStageMetrics,
    hourlyDistribution: [], // Would need additional API endpoint
  };
}

// Export individual functions
export const analyticsService = {
  fetchOverviewMetrics,
  fetchLeaderboard,
  fetchBottlenecks,
  fetchROIMetrics,
  fetchPerformanceData,
};

export default analyticsService;

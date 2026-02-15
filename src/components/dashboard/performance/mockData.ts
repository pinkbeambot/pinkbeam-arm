/**
 * Performance Dashboard Mock Data
 * Realistic mock data for development and testing
 */

import type { 
  PerformanceDashboardData, 
  AgentPerformance, 
  TimeSeriesDataPoint,
  Bottleneck,
  ROIMetrics,
  TaskStageMetrics
} from './types';
import type { Agent, AgentStatus } from '@/types';

// Helper to generate sparkline data
function generateSparkline(
  days: number, 
  baseValue: number, 
  variance: number
): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * variance;
    data.push({
      timestamp: date.toISOString(),
      value: Math.max(0, Math.round((baseValue + variation) * 10) / 10),
      label: date.toLocaleDateString('en-US', { weekday: 'short' })
    });
  }
  return data;
}

// Mock agents
export const mockAgents: Agent[] = [
  {
    id: 'agent-001',
    tenant_id: 'tenant-001',
    name: 'Sales SDR Pro',
    slug: 'sales-sdr-pro',
    role: 'worker',
    status: 'active' as AgentStatus,
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sales-sdr',
    description: 'Outbound sales development representative',
    capabilities: ['delegate', 'decide', 'escalate', 'access_external'],
    model: 'claude-3-5-sonnet',
    depth: 1,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-02-13T00:00:00Z',
    last_active_at: '2024-02-13T10:30:00Z',
  },
  {
    id: 'agent-002',
    tenant_id: 'tenant-001',
    name: 'Content Writer',
    slug: 'content-writer',
    role: 'worker',
    status: 'active' as AgentStatus,
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=content-writer',
    description: 'Blog post and content creation specialist',
    capabilities: ['decide', 'escalate'],
    model: 'gpt-4',
    depth: 1,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-02-13T00:00:00Z',
    last_active_at: '2024-02-13T09:45:00Z',
  },
  {
    id: 'agent-003',
    tenant_id: 'tenant-001',
    name: 'Support Hero',
    slug: 'support-hero',
    role: 'worker',
    status: 'active' as AgentStatus,
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=support-hero',
    description: 'Customer support and issue resolution',
    capabilities: ['decide', 'escalate', 'access_external'],
    model: 'claude-3-5-sonnet',
    depth: 1,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-13T00:00:00Z',
    last_active_at: '2024-02-13T11:00:00Z',
  },
  {
    id: 'agent-004',
    tenant_id: 'tenant-001',
    name: 'Research Analyst',
    slug: 'research-analyst',
    role: 'specialist',
    status: 'idle' as AgentStatus,
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=research-analyst',
    description: 'Market research and data analysis',
    capabilities: ['delegate', 'decide', 'escalate', 'access_external'],
    model: 'gpt-4',
    depth: 1,
    created_at: '2024-02-05T00:00:00Z',
    updated_at: '2024-02-13T00:00:00Z',
    last_active_at: '2024-02-12T16:30:00Z',
  },
  {
    id: 'agent-005',
    tenant_id: 'tenant-001',
    name: 'Email Manager',
    slug: 'email-manager',
    role: 'worker',
    status: 'active' as AgentStatus,
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=email-manager',
    description: 'Email inbox management and responses',
    capabilities: ['decide', 'escalate', 'access_external'],
    model: 'claude-3-haiku',
    depth: 1,
    created_at: '2024-02-10T00:00:00Z',
    updated_at: '2024-02-13T00:00:00Z',
    last_active_at: '2024-02-13T10:15:00Z',
  },
  {
    id: 'agent-006',
    tenant_id: 'tenant-001',
    name: 'Social Media Pro',
    slug: 'social-media-pro',
    role: 'worker',
    status: 'active' as AgentStatus,
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=social-media',
    description: 'Social media content and scheduling',
    capabilities: ['decide', 'escalate', 'access_external'],
    model: 'gpt-4',
    depth: 1,
    created_at: '2024-02-12T00:00:00Z',
    updated_at: '2024-02-13T00:00:00Z',
    last_active_at: '2024-02-13T09:00:00Z',
  },
];

// Generate agent performance data
export function generateAgentPerformance(dateRange: string): AgentPerformance[] {
  const performances: AgentPerformance[] = [
    {
      agent: mockAgents[0],
      rank: 1,
      tasksCompleted: 342,
      tasksFailed: 8,
      avgCompletionTime: 12.5,
      successRate: 97.7,
      escalationRate: 5.2,
      totalCost: 456.80,
      trend: generateSparkline(30, 12, 4),
    },
    {
      agent: mockAgents[1],
      rank: 2,
      tasksCompleted: 298,
      tasksFailed: 12,
      avgCompletionTime: 28.3,
      successRate: 96.1,
      escalationRate: 8.7,
      totalCost: 523.40,
      trend: generateSparkline(30, 10, 5),
    },
    {
      agent: mockAgents[2],
      rank: 3,
      tasksCompleted: 287,
      tasksFailed: 15,
      avgCompletionTime: 8.7,
      successRate: 95.0,
      escalationRate: 12.3,
      totalCost: 312.60,
      trend: generateSparkline(30, 9.5, 3),
    },
    {
      agent: mockAgents[3],
      rank: 4,
      tasksCompleted: 156,
      tasksFailed: 4,
      avgCompletionTime: 45.2,
      successRate: 97.5,
      escalationRate: 15.4,
      totalCost: 678.90,
      trend: generateSparkline(30, 5, 2),
    },
    {
      agent: mockAgents[4],
      rank: 5,
      tasksCompleted: 234,
      tasksFailed: 18,
      avgCompletionTime: 6.4,
      successRate: 92.8,
      escalationRate: 4.7,
      totalCost: 156.30,
      trend: generateSparkline(30, 8, 6),
    },
    {
      agent: mockAgents[5],
      rank: 6,
      tasksCompleted: 189,
      tasksFailed: 6,
      avgCompletionTime: 22.1,
      successRate: 96.9,
      escalationRate: 7.1,
      totalCost: 398.50,
      trend: generateSparkline(30, 6, 3),
    },
  ];

  return performances.sort((a, b) => a.rank - b.rank);
}

// Generate ROI metrics
export function generateROIMetrics(dateRange: string): ROIMetrics {
  const totalTasks = 1506;
  const totalCost = 2526.50;
  const estimatedHumanHours = 450; // 18 minutes per task average
  const humanRate = 75; // $75/hour
  
  return {
    totalTasksCompleted: totalTasks,
    totalCost: totalCost,
    estimatedHumanHoursSaved: estimatedHumanHours,
    humanHourlyRate: humanRate,
    estimatedValueGenerated: estimatedHumanHours * humanRate,
    roiPercentage: ((estimatedHumanHours * humanRate - totalCost) / totalCost) * 100,
    costPerTask: totalCost / totalTasks,
    tasksPerDollar: totalTasks / totalCost,
    projectedMonthlyCost: totalCost * 4.3,
    projectedAnnualCost: totalCost * 52,
  };
}

// Generate bottleneck data
export function generateBottlenecks(dateRange: string): Bottleneck[] {
  return [
    {
      id: 'bottleneck-001',
      type: 'stage',
      name: 'Needs Review',
      description: 'Tasks are piling up in review queue',
      severity: 'high',
      tasksAffected: 23,
      avgWaitTime: 240,
      recommendation: 'Consider automating approval for low-risk tasks',
    },
    {
      id: 'bottleneck-002',
      type: 'agent',
      name: 'Research Analyst',
      description: 'Agent has highest escalation rate and long completion times',
      severity: 'medium',
      tasksAffected: 8,
      avgWaitTime: 180,
      recommendation: 'Review agent configuration and escalation thresholds',
    },
    {
      id: 'bottleneck-003',
      type: 'dependency',
      name: 'External API Delays',
      description: 'Third-party API calls causing task delays',
      severity: 'medium',
      tasksAffected: 15,
      avgWaitTime: 120,
      recommendation: 'Implement caching or async processing',
    },
    {
      id: 'bottleneck-004',
      type: 'stage',
      name: 'In Progress',
      description: 'Tasks taking longer than expected in active work',
      severity: 'low',
      tasksAffected: 12,
      avgWaitTime: 90,
      recommendation: 'Monitor task complexity and agent workload',
    },
  ];
}

// Generate task stage metrics
export function generateTaskStageMetrics(dateRange: string): TaskStageMetrics[] {
  return [
    {
      stage: 'Queued',
      count: 18,
      avgTime: 15,
      trend: generateSparkline(30, 20, 8),
    },
    {
      stage: 'In Progress',
      count: 42,
      avgTime: 25,
      trend: generateSparkline(30, 35, 10),
    },
    {
      stage: 'Needs Review',
      count: 23,
      avgTime: 240,
      trend: generateSparkline(30, 180, 60),
    },
    {
      stage: 'Completed',
      count: 1506,
      avgTime: 18,
      trend: generateSparkline(30, 50, 15),
    },
  ];
}

// Generate hourly distribution
export function generateHourlyDistribution(): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  for (let i = 0; i < 24; i++) {
    // Simulate higher activity during business hours
    let baseValue = 5;
    if (i >= 9 && i <= 17) baseValue = 25;
    if (i >= 10 && i <= 14) baseValue = 40;
    if (i >= 20 || i <= 6) baseValue = 3;
    
    data.push({
      timestamp: `${i}:00`,
      value: Math.round(baseValue + (Math.random() - 0.5) * 10),
      label: `${i}:00`,
    });
  }
  return data;
}

// Main mock data generator
export function generatePerformanceData(dateRange: string): PerformanceDashboardData {
  const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  
  return {
    dateRange: dateRange as { start: Date; end: Date },
    metrics: {
      tasksCompleted: {
        title: 'Tasks Completed',
        value: 1506,
        change: 12.5,
        changeLabel: 'vs last period',
        trend: generateSparkline(days, 45, 12),
        format: 'number',
      },
      activeAgents: {
        title: 'Active Agents',
        value: 5,
        change: 20,
        changeLabel: 'vs last period',
        trend: generateSparkline(days, 4.5, 1),
        format: 'number',
      },
      avgCompletionTime: {
        title: 'Avg Completion Time',
        value: 18.3,
        change: -8.2,
        changeLabel: 'vs last period',
        trend: generateSparkline(days, 22, 5),
        format: 'time',
      },
      successRate: {
        title: 'Success Rate',
        value: 95.8,
        change: 2.1,
        changeLabel: 'vs last period',
        trend: generateSparkline(days, 94, 3),
        format: 'percentage',
      },
      totalEscalations: {
        title: 'Total Escalations',
        value: 87,
        change: -15.3,
        changeLabel: 'vs last period',
        trend: generateSparkline(days, 3, 2),
        format: 'number',
      },
      totalCost: {
        title: 'Total Cost',
        value: 2526.50,
        change: 5.2,
        changeLabel: 'vs last period',
        trend: generateSparkline(days, 350, 80),
        format: 'currency',
      },
    },
    agentLeaderboard: generateAgentPerformance(dateRange),
    roi: generateROIMetrics(dateRange),
    bottlenecks: generateBottlenecks(dateRange),
    taskStageMetrics: generateTaskStageMetrics(dateRange),
    hourlyDistribution: generateHourlyDistribution(),
  };
}

/**
 * Performance Dashboard Types
 * Metrics, analytics, and ROI data structures
 */

import type { Agent, AgentStatus } from '@/types';

export type DateRange = 'today' | '7d' | '30d' | '90d';

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  trend: TimeSeriesDataPoint[];
  format?: 'number' | 'percentage' | 'time' | 'currency';
}

export interface AgentPerformance {
  agent: Agent;
  rank: number;
  tasksCompleted: number;
  tasksFailed: number;
  avgCompletionTime: number; // in minutes
  successRate: number; // 0-100
  escalationRate: number; // 0-100
  totalCost: number; // in USD
  trend: TimeSeriesDataPoint[];
}

export interface ROIMetrics {
  totalTasksCompleted: number;
  totalCost: number;
  estimatedHumanHoursSaved: number;
  humanHourlyRate: number;
  estimatedValueGenerated: number;
  roiPercentage: number;
  costPerTask: number;
  tasksPerDollar: number;
  projectedMonthlyCost: number;
  projectedAnnualCost: number;
}

export interface Bottleneck {
  id: string;
  type: 'agent' | 'stage' | 'dependency';
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tasksAffected: number;
  avgWaitTime: number; // in minutes
  recommendation: string;
}

export interface TaskStageMetrics {
  stage: string;
  count: number;
  avgTime: number;
  trend: TimeSeriesDataPoint[];
}

export interface PerformanceDashboardData {
  dateRange: DateRange;
  metrics: {
    tasksCompleted: MetricCardData;
    activeAgents: MetricCardData;
    avgCompletionTime: MetricCardData;
    successRate: MetricCardData;
    totalEscalations: MetricCardData;
    totalCost: MetricCardData;
  };
  agentLeaderboard: AgentPerformance[];
  roi: ROIMetrics;
  bottlenecks: Bottleneck[];
  taskStageMetrics: TaskStageMetrics[];
  hourlyDistribution: TimeSeriesDataPoint[];
}

export type LeaderboardSortField = 
  | 'rank' 
  | 'tasksCompleted' 
  | 'avgCompletionTime' 
  | 'successRate' 
  | 'escalationRate';

export type SortDirection = 'asc' | 'desc';

export interface ExportOptions {
  format: 'csv' | 'json';
  sections: ('metrics' | 'leaderboard' | 'roi' | 'bottlenecks')[];
  dateRange: DateRange;
}

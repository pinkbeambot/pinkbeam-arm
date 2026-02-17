/**
 * Analytics Types for ARM Dashboard
 */

// Date Range Types
export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  preset?: DateRangePreset;
}

// Filter Types
export interface AnalyticsFilters {
  dateRange: DateRange;
  agentIds?: string[];
  categories?: string[];
  taskStatuses?: string[];
  decisionStatuses?: string[];
}

// Agent Performance Analytics
export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  agentRole: string;
  avatarUrl?: string;
  tasksCompleted: number;
  tasksFailed: number;
  tasksInProgress: number;
  successRate: number;
  avgTaskDuration: number;
  totalCost: number;
  escalationsRaised: number;
  lastActiveAt?: string;
}

export interface AgentPerformanceResponse {
  data: AgentPerformanceMetrics[];
  summary: {
    totalAgents: number;
    activeAgents: number;
    totalTasksCompleted: number;
    overallSuccessRate: number;
    totalCost: number;
  };
}

// Task Pipeline Analytics
export interface TaskStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface TaskPipelineStage {
  name: string;
  count: number;
  percentage: number;
  dropOffCount?: number;
  dropOffPercentage?: number;
}

export interface TaskPipelineResponse {
  stages: TaskPipelineStage[];
  statusBreakdown: TaskStatusBreakdown[];
  summary: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    inProgressTasks: number;
    avgCompletionTime: number;
    completionRate: number;
  };
}

// Decision Analytics
export interface DecisionCategoryMetrics {
  category: string;
  total: number;
  approved: number;
  rejected: number;
  overridden: number;
  approvalRate: number;
}

export interface DecisionTrend {
  date: string;
  proposed: number;
  approved: number;
  rejected: number;
  overridden: number;
}

export interface DecisionAnalyticsResponse {
  categories: DecisionCategoryMetrics[];
  trends: DecisionTrend[];
  summary: {
    totalDecisions: number;
    approvedCount: number;
    rejectedCount: number;
    overriddenCount: number;
    pendingCount: number;
    overallApprovalRate: number;
    avgConfidence: number;
  };
}

// Cost Analytics
export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface CostTrend {
  date: string;
  cost: number;
  taskCount: number;
  costPerTask: number;
}

export interface AgentCostMetrics {
  agentId: string;
  agentName: string;
  totalCost: number;
  taskCount: number;
  avgCostPerTask: number;
  tokensUsed: number;
}

export interface CostAnalyticsResponse {
  trends: CostTrend[];
  breakdown: CostBreakdown[];
  byAgent: AgentCostMetrics[];
  summary: {
    totalCost: number;
    totalTasks: number;
    avgCostPerTask: number;
    totalTokens: number;
    projectedMonthlyCost: number;
  };
}

// Activity Timeline Analytics
export interface ActivityTimelineItem {
  id: string;
  type: string;
  category: string;
  title: string;
  description?: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
  taskId?: string;
  decisionId?: string;
  escalationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityTimelineResponse {
  activities: ActivityTimelineItem[];
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
  };
}

// Export Types
export type ExportFormat = 'csv' | 'pdf';

export interface ExportRequest {
  format: ExportFormat;
  filters: AnalyticsFilters;
  widgets: string[];
}

export interface ExportResponse {
  downloadUrl: string;
  expiresAt: string;
}

// API Query Parameters
export interface AnalyticsQueryParams {
  from: string;
  to: string;
  agentIds?: string[];
  categories?: string[];
  limit?: number;
  offset?: number;
}

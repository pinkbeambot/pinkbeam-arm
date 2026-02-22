/**
 * Advanced Analytics Types for ARM Dashboard
 * ML-powered insights and predictive analytics
 */

import type { DateRange } from './analytics';

// ============================================================================
// PREDICTIVE ANALYTICS
// ============================================================================

export interface TaskCompletionPrediction {
  taskId: string;
  predictedDuration: number; // in minutes
  confidenceScore: number; // 0-1
  factors: PredictionFactor[];
  estimatedCompletionAt: string;
}

export interface PredictionFactor {
  name: string;
  impact: 'high' | 'medium' | 'low';
  weight: number; // -1 to 1
  description: string;
}

export interface WorkloadForecast {
  date: string;
  predictedTasks: number;
  predictedCost: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  factors: string[];
}

export interface AgentWorkloadForecast {
  agentId: string;
  agentName: string;
  currentLoad: number; // 0-100
  predictedLoad: number; // 0-100
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendedAction?: string;
  forecast: WorkloadForecastPoint[];
}

export interface WorkloadForecastPoint {
  date: string;
  load: number;
  tasks: number;
}

export interface CostProjection {
  period: 'daily' | 'weekly' | 'monthly';
  currentSpend: number;
  projectedSpend: number;
  projectedChange: number;
  trend: 'up' | 'down' | 'stable';
  breakdown: {
    llmUsage: number;
    escalations: number;
    other: number;
  };
  forecast: CostForecastPoint[];
}

export interface CostForecastPoint {
  date: string;
  projected: number;
  actual?: number;
  confidence: {
    lower: number;
    upper: number;
  };
}

export interface Anomaly {
  id: string;
  type: 'cost' | 'performance' | 'activity' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detectedAt: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentage
  relatedEntities: {
    agentId?: string;
    taskId?: string;
    escalationId?: string;
  };
  recommendedAction?: string;
}

// ============================================================================
// ENHANCED VISUALIZATIONS
// ============================================================================

export interface TimeSeriesData {
  date: string;
  value: number;
  predicted?: number;
  trendLine?: number;
  upperBound?: number;
  lowerBound?: number;
}

export interface HeatmapCell {
  x: string; // hour or day
  y: string; // day of week or category
  value: number;
  intensity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActivityHeatmapData {
  type: 'hourly' | 'daily' | 'weekly';
  cells: HeatmapCell[];
  xLabels: string[];
  yLabels: string[];
  maxValue: number;
  minValue: number;
}

export interface CohortData {
  cohortDate: string;
  size: number;
  retention: number[]; // percentage retained at each period
  metrics: {
    avgTasks: number;
    avgCost: number;
    churnRate: number;
  };
}

export interface CohortAnalysis {
  cohorts: CohortData[];
  periods: string[];
  metricType: 'retention' | 'activity' | 'cost';
}

export interface PeriodComparison {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number; // percentage
  changeType: 'positive' | 'negative' | 'neutral';
  trend: 'up' | 'down' | 'stable';
  chartData: ComparisonDataPoint[];
}

export interface ComparisonDataPoint {
  label: string;
  current: number;
  previous: number;
  change: number;
}

// ============================================================================
// REAL-TIME METRICS
// ============================================================================

export interface RealtimeMetrics {
  timestamp: string;
  agents: {
    total: number;
    active: number;
    idle: number;
    busy: number;
    error: number;
  };
  tasks: {
    total: number;
    queued: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  cost: {
    currentHour: number;
    today: number;
    rate: number; // per minute
  };
  system: {
    health: 'healthy' | 'degraded' | 'unhealthy';
    apiLatency: number; // ms
    errorRate: number; // percentage
    queueDepth: number;
  };
}

export interface AgentStatusUpdate {
  agentId: string;
  agentName: string;
  status: string;
  currentTask?: string;
  lastActivityAt: string;
  metrics: {
    tasksCompleted: number;
    successRate: number;
    currentCost: number;
  };
}

// ============================================================================
// LLM INSIGHTS
// ============================================================================

export interface NLQueryResult {
  query: string;
  intent: string;
  filters: Record<string, unknown>;
  results: unknown;
  summary: string;
  recommendations: string[];
  visualizations: VisualizationRecommendation[];
}

export interface VisualizationRecommendation {
  type: 'chart' | 'table' | 'metric' | 'heatmap';
  title: string;
  description: string;
  config: Record<string, unknown>;
}

export interface AutomatedInsight {
  id: string;
  category: 'performance' | 'cost' | 'bottleneck' | 'opportunity' | 'risk';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: {
    label: string;
    value: string;
    change?: string;
  }[];
  context: string;
  recommendation: string;
  createdAt: string;
}

export interface SmartAlert {
  id: string;
  type: 'cost' | 'performance' | 'system' | 'security';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  condition: string;
  triggeredAt: string;
  acknowledged: boolean;
  actions: {
    label: string;
    action: string;
  }[];
}

// ============================================================================
// EXPORT & REPORTING
// ============================================================================

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  sections: ReportSection[];
  filters: {
    dateRange: DateRange;
    agentIds?: string[];
    categories?: string[];
  };
  format: 'pdf' | 'csv' | 'both';
  enabled: boolean;
  lastSentAt?: string;
  nextSendAt?: string;
}

export interface ReportSection {
  type: 'summary' | 'agents' | 'tasks' | 'costs' | 'decisions' | 'insights';
  title: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface GeneratedReport {
  id: string;
  name: string;
  generatedAt: string;
  format: 'pdf' | 'csv';
  downloadUrl: string;
  expiresAt: string;
  size: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface PredictiveAnalyticsRequest {
  dateRange: DateRange;
  forecastHorizon?: number; // days to forecast
  agentIds?: string[];
}

export interface PredictiveAnalyticsResponse {
  taskPredictions: TaskCompletionPrediction[];
  workloadForecasts: AgentWorkloadForecast[];
  costProjection: CostProjection;
  anomalies: Anomaly[];
  generatedAt: string;
}

export interface HeatmapRequest {
  type: 'hourly' | 'daily' | 'weekly';
  dateRange: DateRange;
  metric: 'tasks' | 'cost' | 'activity';
}

export interface CohortRequest {
  cohortType: 'agent' | 'task';
  periods: number;
  metric: 'retention' | 'activity' | 'cost';
}

export interface NLQueryRequest {
  query: string;
  context?: {
    dateRange?: DateRange;
    agentIds?: string[];
  };
}

export interface RealtimeMetricsResponse {
  metrics: RealtimeMetrics;
  agentUpdates: AgentStatusUpdate[];
  timestamp: string;
}

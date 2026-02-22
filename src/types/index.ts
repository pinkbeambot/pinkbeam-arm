/**
 * ARM Type Definitions
 * Based on AGENT-PROTOCOL.md and PRD
 */

// Enums
export type AgentStatus = 
  | 'initializing' 
  | 'idle' 
  | 'active' 
  | 'paused' 
  | 'blocked' 
  | 'error' 
  | 'escaped' 
  | 'terminated';

export type AgentRole = 
  | 'ceo' 
  | 'manager' 
  | 'worker' 
  | 'specialist' 
  | 'system';

export type Capability = 
  | 'spawn' 
  | 'delegate' 
  | 'decide' 
  | 'escalate' 
  | 'access_external' 
  | 'modify_config';

export type TaskStatus = 
  | 'queued' 
  | 'in_progress' 
  | 'blocked' 
  | 'review' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type TaskPriority = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'urgent';

export type EscalationUrgency = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'critical';

export type EscalationType = 
  | 'clarification' 
  | 'approval' 
  | 'error' 
  | 'edge_case';

export type DecisionStatus = 
  | 'proposed' 
  | 'approved' 
  | 'rejected' 
  | 'overridden' 
  | 'executed';

export type DecisionCategory = 
  | 'action' 
  | 'resource' 
  | 'escalation' 
  | 'strategy';

// Core Agent Types
export interface Agent {
  id: string;
  tenant_id: string;
  parent_id?: string | null;
  root_id?: string;
  depth: number;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  avatar_url?: string;
  description?: string;
  capabilities: Capability[];
  model?: string;
  configuration?: Record<string, unknown>;
  current_task_id?: string;
  current_task?: Task;
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  metadata?: Record<string, unknown>;
  // Extended fields from mock data
  slug?: string;
  status_reason?: string;
  activated_at?: string;
  llm_config?: {
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
  };
  limits?: {
    max_sub_agents: number;
    escalation_threshold: number;
    timeout_seconds: number;
    max_tokens_per_task: number;
    max_cost_per_task_usd: number;
  };
  stats?: {
    tasks_completed: number;
    tasks_failed: number;
    escalations_raised: number;
    avg_task_duration_seconds: number;
    total_cost_usd: number;
  };
}

export interface AgentWithStats extends Agent {
  tasks_completed: number;
  success_rate: number;
  avg_task_duration: number;
  escalation_count: number;
}

// Task Types
export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_agent_id?: string;
  assigned_agent?: Agent;
  created_by?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  estimated_duration?: number;
  actual_duration?: number;
  acceptance_criteria?: string[];
  metadata?: Record<string, unknown>;
  // Extended fields from mock data
  type?: string;
  assignee_id?: string;
  assigner_id?: string;
  parent_task_id?: string;
  depth?: number;
  progress_percent?: number;
  current_step?: string;
  cost_usd?: number;
  tokens_used?: number;
  deadline_at?: string;
}

// Activity Types
export type ActivityType = 
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'decision_made'
  | 'escalation_raised'
  | 'escalation_resolved'
  | 'handoff'
  | 'error'
  | 'agent_spawned'
  | 'agent_status_changed'
  | 'message';

export interface Activity {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent?: Agent;
  type: ActivityType | string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  related_task_id?: string;
  related_decision_id?: string;
  related_escalation_id?: string;
  created_at: string;
  // Extended fields for activity feed
  actor_id?: string;
  actor_type?: 'agent' | 'user' | 'system';
  target_id?: string;
  target_type?: 'task' | 'decision' | 'escalation' | 'agent';
  // Extended fields from mock data
  category?: string;
  task_id?: string;
  sequence_number?: number;
}

// Decision Types
export interface Decision {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent?: Agent;
  task_id?: string;
  status: DecisionStatus;
  title: string;
  description: string;
  reasoning?: string;
  alternatives_considered?: string[];
  confidence: number;
  proposed_action?: Record<string, unknown>;
  overridden_by?: string;
  override_reason?: string;
  executed_at?: string;
  created_at: string;
}

// Escalation Types
export interface Escalation {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent?: Agent;
  task_id?: string;
  type: 'clarification' | 'approval' | 'error' | 'edge_case';
  urgency: EscalationUrgency;
  title: string;
  description: string;
  context?: string;
  agent_recommendation?: string;
  agent_confidence?: number;
  status: 'open' | 'resolved';
  resolved_by?: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
  updated_at?: string;
  // Extended fields
  question?: {
    title: string;
    details: string;
    options?: string[];
  };
  agent_analysis?: {
    what_i_know: string;
    what_i_dont_know: string;
    what_i_tried: string[];
    suggested_resolution?: string;
  };
  situation_context?: {
    error_code?: string;
    retry_after?: number;
  };
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

// UI Types
export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'status' | 'last_active' | 'tasks_completed';
export type SortOrder = 'asc' | 'desc';

// Form Types
export interface CreateAgentInput {
  name: string;
  role: AgentRole;
  description: string;
  avatar_url?: string;
  model?: string;
  capabilities?: Capability[];
  parent_id?: string;
}

// Realtime Types
export interface RealtimeChangePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}

// ============================================================================
// Agent Configuration Types
// ============================================================================

export interface AgentConfig {
  basic_info?: {
    name?: string;
    role?: string;
    avatar_url?: string;
    description?: string;
  };
  instructions?: {
    system_prompt?: string;
    success_criteria?: string;
    examples?: Array<{
      input: string;
      output: string;
      description?: string;
    }>;
  };
  tools?: {
    enabled?: string[];
    config?: Record<string, unknown>;
  };
  permissions?: {
    data_access?: Record<string, 'none' | 'read' | 'write' | 'admin'>;
    external_apis?: string[];
  };
  escalation?: {
    triggers?: Record<string, boolean | { amount_usd?: number; deal_size_usd?: number; confidence_threshold?: number }>;
    thresholds?: {
      confidence?: number;
    };
    quiet_hours?: {
      enabled?: boolean;
      start?: string;
      end?: string;
      timezone?: string;
    };
  };
  advanced?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    timeout_seconds?: number;
    json_mode?: boolean;
  };
}

export interface AgentConfigRecord {
  id: string;
  tenant_id: string;
  agent_id: string;
  config: AgentConfig;
  version_id: string;
  version_number: number;
  is_valid: boolean;
  validation_errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  last_tested_at?: string;
  last_test_result?: {
    success: boolean;
    test_input: string;
    response_time_ms: number;
  };
  created_at: string;
  updated_at: string;
}

export interface AgentConfigVersion {
  id: string;
  tenant_id: string;
  agent_id: string;
  version_number: number;
  name?: string;
  description?: string;
  config: AgentConfig;
  change_type: 'manual' | 'auto_save' | 'restore' | 'template_import' | 'clone';
  changed_by?: string;
  change_summary?: {
    is_initial?: boolean;
    previous_version?: number;
    changed_fields?: string[];
    restored_from_version?: number;
    restored_from_version_id?: string;
  };
  is_valid: boolean;
  validation_errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  created_at: string;
}

export interface AgentTemplate {
  id: string;
  tenant_id?: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  icon?: string;
  color?: string;
  config: AgentConfig;
  capabilities: string[];
  recommended_model?: string;
  recommended_tools?: string[];
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConfigTestResult {
  id: string;
  tenant_id: string;
  agent_id: string;
  config_version_id?: string;
  test_input: string;
  test_output?: string;
  success: boolean;
  response_time_ms: number;
  tokens_used?: number;
  cost_usd?: number;
  error_message?: string;
  error_details?: unknown;
  model_used?: string;
  raw_response?: unknown;
  created_at: string;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageTypeValue =
  | 'spawn.request' | 'spawn.response'
  | 'task.assign' | 'task.accept' | 'task.reject' | 'task.progress' | 'task.complete' | 'task.fail'
  | 'decision.propose' | 'decision.confirm' | 'decision.override'
  | 'escalate.request' | 'escalate.response'
  | 'message.direct' | 'message.broadcast'
  | 'system.ping' | 'system.pong' | 'system.config.update' | 'system.error';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Message {
  id: string;
  tenant_id: string;
  protocol_version: string;
  message_type: MessageTypeValue;
  from_agent_id?: string;
  from_agent?: Agent;
  to_agent_id?: string;
  to_agent?: Agent;
  to_broadcast: boolean;
  thread_id?: string;
  correlation_id?: string;
  payload: Record<string, unknown>;
  priority: MessagePriority;
  requires_ack: boolean;
  acked_at?: string;
  trace?: unknown[];
  expires_at?: string;
  created_at: string;
  processed_at?: string;
}

export interface MessageThread {
  id: string;
  messages: Message[];
  participants: Agent[];
  message_count: number;
  last_message_at: string;
}

export interface MessageListResponse {
  data: Message[];
  meta: {
    filters: {
      agent_id?: string;
      thread_id?: string;
      from_agent_id?: string;
      to_agent_id?: string;
      message_type?: string;
      unread?: boolean;
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageResponse {
  data: Message;
}

export interface ThreadMessagesResponse {
  data: Message[];
  meta: {
    thread_id: string;
    message_count: number;
  };
}

// ============================================================================
// Notification Types
// ============================================================================

export type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationFilters,
  NotificationPreference,
  NotificationSettingsFormData,
  NotificationWebSocketMessage,
  NotificationListResponse,
  NotificationPreferenceResponse,
  NotificationDisplayProps,
  NotificationBellProps,
  NotificationDropdownProps,
} from './notification';

export { DEFAULT_NOTIFICATION_PREFERENCES } from './notification';

// ============================================================================
// Chat Types
// ============================================================================

export type {
  Chat,
  ChatMessage,
  ChatMessageRole,
  ChatMetadata,
  MessageMetadata,
  CreateChatRequest,
  CreateChatResponse,
  GetChatMessagesRequest,
  GetChatMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  ListChatsResponse,
  ChatContext,
  ContextActivity,
  ContextTask,
  ContextDecision,
  ContextEscalation,
  ContextAgent,
  ChatPanelProps,
  ChatMessageProps,
  ChatInputProps,
  ChatListProps,
  ChatRealtimeMessage,
  TypingIndicator,
  ChatSearchResult,
} from './chat';

// ============================================================================
// Meta-Agent (VALIS) Types
// ============================================================================

export type {
  MetaAgentIntent,
  MetaAgentCommandStatus,
  ExtractedEntities,
  MetaAgentSession,
  MetaAgentSessionContext,
  PendingAction,
  MetaAgentCommand,
  MetaAgentResult,
  MetaAgentResponseMetadata,
  ProcessMessageRequest,
  ProcessMessageResponse,
  SuggestedAction,
  ListSessionsRequest,
  ListSessionsResponse,
  GetSessionHistoryRequest,
  GetSessionHistoryResponse,
  ConfirmCommandRequest,
  IntentHandlerContext,
  IntentHandlerInput,
  IntentHandlerOutput,
  IntentHandler,
  StatusQueryParams,
  WorkforceStatus,
  AgentStatusSummary,
  TaskSummary,
  AssignTaskParams,
  AssignTaskResult,
  CreateIssueParams,
  CreateIssueResult,
  QueryParams,
  QueryResult,
  BroadcastParams,
  BroadcastResult,
} from './meta-agent';

// ============================================================================
// Billing Types
// ============================================================================

export type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionTierConfig,
  TenantBilling,
  TenantWithBilling,
  TenantUsage,
  UsageLimits,
  UsageWithLimits,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  Invoice,
  BillingEventType,
  BillingEvent,
  PlanFeature,
  StripeWebhookPayload,
} from './billing';

// Analytics Types
export type {
  DateRangePreset,
  DateRange,
  AnalyticsFilters,
  AgentPerformanceMetrics,
  AgentPerformanceResponse,
  TaskStatusBreakdown,
  TaskPipelineStage,
  TaskPipelineResponse,
  DecisionCategoryMetrics,
  DecisionTrend,
  DecisionAnalyticsResponse,
  CostBreakdown,
  CostTrend,
  AgentCostMetrics,
  CostAnalyticsResponse,
  ActivityTimelineItem,
  ActivityTimelineResponse,
  ExportFormat,
  ExportRequest,
  ExportResponse,
  AnalyticsQueryParams,
} from './analytics';

// Advanced Analytics Types
export type {
  TaskCompletionPrediction,
  PredictionFactor,
  WorkloadForecast,
  AgentWorkloadForecast,
  WorkloadForecastPoint,
  CostProjection,
  CostForecastPoint,
  Anomaly,
  TimeSeriesData,
  HeatmapCell,
  ActivityHeatmapData,
  CohortData,
  CohortAnalysis,
  PeriodComparison,
  ComparisonDataPoint,
  RealtimeMetrics,
  AgentStatusUpdate,
  NLQueryResult,
  VisualizationRecommendation,
  AutomatedInsight,
  SmartAlert,
  ReportConfig,
  ReportSection,
  GeneratedReport,
  PredictiveAnalyticsRequest,
  PredictiveAnalyticsResponse,
  HeatmapRequest,
  CohortRequest,
  NLQueryRequest,
  RealtimeMetricsResponse,
} from './advanced-analytics';

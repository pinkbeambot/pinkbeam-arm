import { z } from 'zod';
import { AgentRole, AgentStatus, TaskStatus, TaskPriority, DecisionCategory, EscalationType, EscalationUrgency } from '@/types';

// ============================================================================
// Agent Validation
// ============================================================================

// Shared JSONB sub-schemas (matches DB CHECK constraints in migration 024)
const llmConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
});

const limitsSchema = z.object({
  max_sub_agents: z.number().int().nonnegative().optional(),
  max_concurrent_tasks: z.number().int().nonnegative().optional(),
  escalation_threshold: z.number().min(0).max(1).optional(),
  timeout_seconds: z.number().int().positive().optional(),
  max_tokens_per_task: z.number().int().positive().optional(),
  max_cost_per_task_usd: z.number().nonnegative().optional(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(100).optional(),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  capabilities: z.array(z.string()).optional(),
  llm_config: llmConfigSchema.optional(),
  limits: limitsSchema.optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated']).optional(),
  capabilities: z.array(z.string()).optional(),
  llm_config: llmConfigSchema.partial().optional(),
  limits: limitsSchema.optional(),
});

export const listAgentsQuerySchema = z.object({
  status: z.enum(['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated']).optional(),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']).optional(),
  search: z.string().max(200).optional(),
  parent_id: z.string().uuid().optional(),
  include_descendants: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// Task Validation
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.string().max(100).default('generic'),
  assignee_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  parent_task_id: z.string().uuid().optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  expected_outputs: z.record(z.string(), z.unknown()).optional(),
  deadline_at: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled']).optional(),
  assignee_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
  current_step: z.string().optional(),
  outputs: z.record(z.string(), z.unknown()).optional(),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled']).optional(),
  assignee_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_after: z.string().datetime().optional(),
  due_before: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).refine(
  data => !data.due_after || !data.due_before || new Date(data.due_before) > new Date(data.due_after),
  { message: 'due_before must be after due_after', path: ['due_before'] }
);

// Enhanced task filtering schema for advanced queries
export const enhancedListTasksQuerySchema = z.object({
  // Single or multiple statuses (comma-separated)
  status: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const statuses = val.split(',').map(s => s.trim()).filter(Boolean);
    const validStatuses = ['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'];
    return statuses.filter(s => validStatuses.includes(s));
  }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  agent_id: z.string().uuid().optional(),
  assignee_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  due_before: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  search: z.string().min(1).max(200).optional(),
  sort: z.enum(['created_at', 'updated_at', 'deadline_at', 'priority']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Batch operations schemas
export const batchCreateTaskSchema = z.object({
  tasks: z.array(createTaskSchema).min(1).max(100),
});

export const batchUpdateTaskItemSchema = z.object({
  id: z.string().uuid(),
  data: updateTaskSchema,
});

export const batchUpdateTaskSchema = z.object({
  tasks: z.array(batchUpdateTaskItemSchema).min(1).max(100),
});

export const batchDeleteTaskSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  force: z.boolean().default(false), // Force delete even if in_progress
});

// Task tree query schema
export const taskTreeQuerySchema = z.object({
  root_id: z.string().uuid(),
  max_depth: z.coerce.number().int().min(1).max(10).default(10),
  include_completed: z.boolean().default(true),
});

// ============================================================================
// Decision Validation
// ============================================================================

export const createDecisionSchema = z.object({
  agent_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  category: z.enum(['action', 'resource', 'escalation', 'strategy', 'system']),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  proposed_action: z.record(z.string(), z.unknown()),
  reasoning: z.object({
    context: z.string(),
    analysis: z.string(),
    options_considered: z.array(z.object({
      description: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      estimated_outcome: z.string(),
      confidence: z.number().min(0).max(1),
    })),
    confidence: z.number().min(0).max(1),
    risks: z.array(z.object({
      description: z.string(),
      likelihood: z.enum(['low', 'medium', 'high']),
      impact: z.enum(['low', 'medium', 'high']),
      mitigation: z.string().optional(),
    })),
  }),
  self_authorized: z.boolean().default(false),
});

export const overrideDecisionSchema = z.object({
  reason: z.string().min(1),
  correct_action: z.record(z.string(), z.unknown()).optional(),
});

export const updateDecisionSchema = z.object({
  status: z.enum(['proposed', 'approved', 'rejected', 'overridden', 'executed']).optional(),
  outcome: z.record(z.string(), z.unknown()).optional(),
  executed_action: z.record(z.string(), z.unknown()).optional(),
});

export const listDecisionsQuerySchema = z.object({
  agent_id: z.string().uuid().optional(),
  status: z.enum(['proposed', 'approved', 'rejected', 'overridden', 'executed']).optional(),
  category: z.enum(['action', 'resource', 'escalation', 'strategy', 'system']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  due_before: z.string().datetime().optional(),
  confidence_min: z.coerce.number().min(0).max(1).optional(),
  search: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).refine(
  data => !data.due_after || !data.due_before || new Date(data.due_before) > new Date(data.due_after),
  { message: 'due_before must be after due_after', path: ['due_before'] }
);

// ============================================================================
// Escalation Validation
// ============================================================================

export const createEscalationSchema = z.object({
  agent_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  type: z.enum(['clarification', 'approval', 'error', 'edge_case', 'policy_violation']),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  situation_context: z.record(z.string(), z.unknown()).optional(),
  question: z.object({
    title: z.string().optional(),
    details: z.string().optional(),
    options: z.array(z.string()).optional(),
  }).optional(),
  agent_analysis: z.object({
    what_i_know: z.string().optional(),
    what_i_dont_know: z.string().optional(),
    what_i_tried: z.array(z.string()).optional(),
    suggested_resolution: z.string().optional(),
  }).optional(),
});

export const updateEscalationSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  situation_context: z.record(z.string(), z.unknown()).optional(),
  question: z.object({
    title: z.string().optional(),
    details: z.string().optional(),
    options: z.array(z.string()).optional(),
  }).optional(),
  agent_analysis: z.object({
    what_i_know: z.string().optional(),
    what_i_dont_know: z.string().optional(),
    what_i_tried: z.array(z.string()).optional(),
    suggested_resolution: z.string().optional(),
  }).optional(),
});

export const resolveEscalationSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolution_type: z.string().optional(),
  resolution_answer: z.string().min(1),
  resolution_resources: z.record(z.string(), z.unknown()).optional(),
  learning_notes: z.string().optional(),
});

export const listEscalationsQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  type: z.enum(['clarification', 'approval', 'error', 'edge_case', 'policy_violation']).optional(),
  agent_id: z.string().uuid().optional(),
  search: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// Activity Validation
// ============================================================================

export const listActivitiesQuerySchema = z.object({
  // Filter by agent (actor or related agent)
  agent_id: z.string().uuid().optional(),
  
  // Filter by entity/category type (tasks, decisions, escalations, agents, system)
  entity_type: z.enum(['all', 'tasks', 'decisions', 'escalations', 'agents', 'system']).optional(),
  
  // Filter by specific action type
  action_type: z.enum([
    'agent.spawned', 'agent.status_changed', 'agent.terminated',
    'task.created', 'task.assigned', 'task.started', 'task.progress', 'task.completed', 'task.failed',
    'decision.proposed', 'decision.made', 'decision.overridden',
    'escalation.created', 'escalation.resolved',
    'message.sent', 'message.received',
    'system.error', 'system.config_changed'
  ]).optional(),
  
  // Time range shortcuts (mutually exclusive with date_from/date_to)
  time_range: z.enum(['1h', '24h', '7d', '30d', 'all']).optional(),
  
  // Explicit date range
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  
  // Search in title and description
  search: z.string().min(1).max(200).optional(),
  
  // Pagination (cursor-based using sequence_number)
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  
  // Legacy support
  type: z.string().optional(),
  before: z.string().optional(),
  category: z.string().optional(),
});

// ============================================================================
// Message Validation
// ============================================================================

// Message type enum values
export const messageTypeSchema = z.enum([
  'spawn.request', 'spawn.response',
  'task.assign', 'task.accept', 'task.reject', 'task.progress', 'task.complete', 'task.fail',
  'decision.propose', 'decision.confirm', 'decision.override',
  'escalate.request', 'escalate.response',
  'message.direct', 'message.broadcast',
  'system.ping', 'system.pong', 'system.config.update', 'system.error'
]);

export const messagePrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const createMessageSchema = z.object({
  message_type: messageTypeSchema,
  from_agent_id: z.string().uuid().optional(),
  to_agent_id: z.string().uuid().optional(),
  to_broadcast: z.boolean().default(false),
  thread_id: z.string().uuid().optional(),
  correlation_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
  priority: messagePrioritySchema.default('normal'),
  requires_ack: z.boolean().default(false),
  trace: z.array(z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
  protocol_version: z.string().default('1.0'),
});

export const listMessagesQuerySchema = z.object({
  from_agent_id: z.string().uuid().optional(),
  to_agent_id: z.string().uuid().optional(),
  message_type: messageTypeSchema.optional(),
  thread_id: z.string().uuid().optional(),
  unread_only: z.enum(['true', 'false']).transform((val) => val === 'true').default(false),
  priority: messagePrioritySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateMessageSchema = z.object({
  acked_at: z.string().datetime().optional(),
  processed_at: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type MessageType = z.infer<typeof messageTypeSchema>;
export type MessagePriority = z.infer<typeof messagePrioritySchema>;

// ============================================================================
// Analytics Validation
// ============================================================================

export const analyticsOverviewQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export const analyticsLeaderboardQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
  sortBy: z.enum(['tasksCompleted', 'successRate', 'avgDuration', 'cost']).default('tasksCompleted'),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const analyticsAgentQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export const analyticsRoiQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
  hourlyRate: z.coerce.number().positive().default(50),
});

export const analyticsBottlenecksQuerySchema = z.object({
  hours: z.coerce.number().int().positive().max(168).default(24),
});

export type AnalyticsOverviewQuery = z.infer<typeof analyticsOverviewQuerySchema>;
export type AnalyticsLeaderboardQuery = z.infer<typeof analyticsLeaderboardQuerySchema>;
export type AnalyticsAgentQuery = z.infer<typeof analyticsAgentQuerySchema>;
export type AnalyticsRoiQuery = z.infer<typeof analyticsRoiQuerySchema>;
export type AnalyticsBottlenecksQuery = z.infer<typeof analyticsBottlenecksQuerySchema>;

// ============================================================================
// Re-export Agent Config Validation
// ============================================================================

export {
  // Schemas
  agentConfigSchema,
  updateAgentConfigSchema,
  listConfigVersionsQuerySchema,
  restoreConfigVersionSchema,
  testAgentConfigSchema,
  listAgentTemplatesQuerySchema,
  applyTemplateSchema,
  compareVersionsQuerySchema,
  // Types
  type AgentConfig,
  type UpdateAgentConfigInput,
  type ListConfigVersionsQuery,
  type RestoreConfigVersionInput,
  type TestAgentConfigInput,
  type ListAgentTemplatesQuery,
  type ApplyTemplateInput,
  type CompareVersionsQuery,
  type ConfigValidationResult,
  type ConfigValidationError,
  // Functions
  validateAgentConfig,
  mergeConfigs,
  stripEmptyValues,
} from './validation/agent-config';

// ============================================================================
// Chat Validation
// ============================================================================

export const createChatSchema = z.object({
  agent_id: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const listChatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  before: z.string().datetime().optional(),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListChatMessagesQuery = z.infer<typeof listChatMessagesQuerySchema>;

// ============================================================================
// Cost Tracking Validation
// ============================================================================

export const listCostsQuerySchema = z.object({
  model: z.string().optional(),
  provider: z.enum(['anthropic', 'openai']).optional(),
  status: z.enum(['success', 'error', 'cached']).optional(),
  agent_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const costSummaryQuerySchema = z.object({
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export const dailyCostsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export type ListCostsQuery = z.infer<typeof listCostsQuerySchema>;
export type CostSummaryQuery = z.infer<typeof costSummaryQuerySchema>;
export type DailyCostsQuery = z.infer<typeof dailyCostsQuerySchema>;

// ============================================================================
// Billing Validation
// ============================================================================

export const createCheckoutSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export const updateSubscriptionSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const listInvoicesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']).optional(),
});

export const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string().startsWith('pm_'),
  setAsDefault: z.boolean().optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;

// ============================================================================
// Email Notification Validation
// ============================================================================

export const sendNotificationEmailSchema = z.object({
  notification_id: z.string().uuid(),
});

export const sendTaskCompleteEmailSchema = z.object({
  task_id: z.string().uuid(),
  task_title: z.string().min(1),
  agent_name: z.string().min(1),
  completed_at: z.string(),
  duration: z.string().optional(),
});

export const digestTypeSchema = z.enum(['daily', 'weekly']);

export type SendNotificationEmailInput = z.infer<typeof sendNotificationEmailSchema>;
export type SendTaskCompleteEmailInput = z.infer<typeof sendTaskCompleteEmailSchema>;
export type DigestType = z.infer<typeof digestTypeSchema>;

// ============================================================================
// Webhook Validation
// ============================================================================

import { WEBHOOK_EVENT_TYPES } from '@/types/webhook';

export const createWebhookEndpointSchema = z.object({
  url: z.string().url(),
  description: z.string().max(500).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES as [string, ...string[]])).min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateWebhookEndpointSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES as [string, ...string[]])).min(1).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const testWebhookSchema = z.object({
  endpoint_id: z.string().uuid(),
});

export const listWebhookDeliveriesQuerySchema = z.object({
  endpoint_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'success', 'failed', 'expired']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;
export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;
export type TestWebhookInput = z.infer<typeof testWebhookSchema>;
export type ListWebhookDeliveriesQuery = z.infer<typeof listWebhookDeliveriesQuerySchema>;

// ============================================================================
// Re-export Auth Validation
// ============================================================================

export {
  jwtClaimsSchema,
  authorizationHeaderSchema,
  tenantContextSchema,
  authResultSchema,
  loginRequestSchema,
  signupRequestSchema,
  refreshTokenRequestSchema,
  magicLinkRequestSchema,
  oauthRequestSchema,
  inviteUserRequestSchema,
  apiErrorSchema,
  validationErrorDetailsSchema,
  // Types
  type JWTClaims,
  type TenantContext,
  type AuthResult,
  type LoginRequest,
  type SignupRequest,
  type RefreshTokenRequest,
  type MagicLinkRequest,
  type OAuthRequest,
  type InviteUserRequest,
  type APIError,
  type ValidationErrorDetails,
} from './validation/auth';

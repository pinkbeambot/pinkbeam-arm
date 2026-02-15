/**
 * Shared Zod schemas for agent runtime edge functions
 */

import { z } from 'https://esm.sh/zod@3.22.4';

// ============================================================================
// Common Schemas
// ============================================================================

export const uuidSchema = z.string().uuid();

export const tenantIdSchema = uuidSchema;

export const agentRoleSchema = z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']);

export const agentStatusSchema = z.enum(['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated']);

export const capabilitySchema = z.enum(['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config']);

export const taskStatusSchema = z.enum(['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled']);

export const taskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const messagePrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const escalationTypeSchema = z.enum(['clarification', 'approval', 'error', 'edge_case', 'policy_violation']);

export const escalationUrgencySchema = z.enum(['low', 'normal', 'high', 'critical']);

export const decisionCategorySchema = z.enum(['action', 'resource', 'escalation', 'strategy', 'system']);

// ============================================================================
// Agent Identity Schema
// ============================================================================

export const agentIdentitySchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  parent_id: uuidSchema.nullable(),
  root_id: uuidSchema,
  depth: z.number().int().min(0),
  role: agentRoleSchema,
  capabilities: z.array(z.string()),
});

// ============================================================================
// Spawn Request Schemas
// ============================================================================

export const spawnRequestSchema = z.object({
  name: z.string().min(1).max(255),
  role: agentRoleSchema,
  goal: z.string(),
  context: z.object({
    task_description: z.string().optional(),
    relevant_history: z.array(z.unknown()).optional(),
    parent_context: z.record(z.unknown()).optional(),
  }).default({}),
  config: z.object({
    capabilities: z.array(z.string()).optional(),
    model: z.string().optional(),
    escalation_threshold: z.number().min(0).max(1).optional(),
    max_sub_agents: z.number().int().min(0).optional(),
    timeout_seconds: z.number().int().positive().optional(),
    budget: z.object({
      max_tokens: z.number().int().positive(),
      max_cost_usd: z.number().positive(),
    }).optional(),
  }).default({}),
  parent_task_id: uuidSchema.optional(),
});

export type SpawnRequest = z.infer<typeof spawnRequestSchema>;

// ============================================================================
// Lifecycle Schemas
// ============================================================================

export const lifecycleActionSchema = z.enum(['pause', 'resume', 'terminate', 'error', 'escape', 'block', 'unblock']);

export const lifecycleRequestSchema = z.object({
  action: lifecycleActionSchema,
  agent_id: uuidSchema,
  tenant_id: uuidSchema,
  triggered_by: uuidSchema.optional(),
  triggered_by_type: z.enum(['agent', 'user', 'system']).optional(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type LifecycleRequest = z.infer<typeof lifecycleRequestSchema>;

// ============================================================================
// Task Execution Schemas
// ============================================================================

export const taskExecuteRequestSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
  action: z.enum(['claim', 'start', 'progress', 'complete', 'fail', 'cancel']),
  payload: z.object({
    progress_percent: z.number().int().min(0).max(100).optional(),
    current_step: z.string().optional(),
    outputs: z.record(z.unknown()).optional(),
    error_message: z.string().optional(),
    tokens_used: z.number().int().optional(),
    cost_usd: z.number().optional(),
  }).default({}),
});

export type TaskExecuteRequest = z.infer<typeof taskExecuteRequestSchema>;

export const taskCreateRequestSchema = z.object({
  tenant_id: uuidSchema,
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.string().default('generic'),
  priority: taskPrioritySchema.default('normal'),
  assignee_id: uuidSchema.optional(),
  assigner_id: uuidSchema.optional(),
  parent_task_id: uuidSchema.optional(),
  deadline_at: z.string().datetime().optional(),
  inputs: z.record(z.unknown()).default({}),
  expected_outputs: z.record(z.unknown()).default({}),
  dependencies: z.array(z.object({
    task_id: uuidSchema,
    dependency_type: z.enum(['blocks', 'requires', 'optional']).default('blocks'),
  })).default([]),
});

export type TaskCreateRequest = z.infer<typeof taskCreateRequestSchema>;

// Task claim request schema
export const taskClaimRequestSchema = z.object({
  task_id: uuidSchema,
  agent_id: uuidSchema,
  tenant_id: uuidSchema.optional(),
});

export type TaskClaimRequest = z.infer<typeof taskClaimRequestSchema>;

// Task start request schema
export const taskStartRequestSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema.optional(),
});

export type TaskStartRequest = z.infer<typeof taskStartRequestSchema>;

// Task complete request schema
export const taskCompleteRequestSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema.optional(),
  payload: z.object({
    outputs: z.record(z.unknown()).optional(),
  }).optional(),
});

export type TaskCompleteRequest = z.infer<typeof taskCompleteRequestSchema>;

// Task fail request schema
export const taskFailRequestSchema = z.object({
  task_id: uuidSchema,
  tenant_id: uuidSchema.optional(),
  payload: z.object({
    error_message: z.string().optional(),
  }).optional(),
});

export type TaskFailRequest = z.infer<typeof taskFailRequestSchema>;

// ============================================================================
// Message Schemas
// ============================================================================

export const messageTypeSchema = z.enum([
  'spawn.request', 'spawn.response',
  'task.assign', 'task.accept', 'task.reject', 'task.progress', 'task.complete', 'task.fail',
  'decision.propose', 'decision.confirm', 'decision.override',
  'escalate.request', 'escalate.response',
  'message.direct', 'message.broadcast',
  'system.ping', 'system.pong', 'system.config.update', 'system.error'
]);

export const sendMessageRequestSchema = z.object({
  tenant_id: uuidSchema,
  message_type: messageTypeSchema,
  from_agent_id: uuidSchema,
  to_agent_id: uuidSchema.optional(),
  to_broadcast: z.boolean().default(false),
  thread_id: uuidSchema.optional(),
  correlation_id: uuidSchema.optional(),
  payload: z.record(z.unknown()),
  priority: messagePrioritySchema.default('normal'),
  requires_ack: z.boolean().default(false),
  trace: z.array(z.string()).default([]),
  ttl_seconds: z.number().int().positive().optional(),
});

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

// ============================================================================
// Webhook Schemas
// ============================================================================

export const webhookPayloadSchema = z.object({
  tenant_id: uuidSchema,
  webhook_type: z.enum([
    'github.push',
    'github.pull_request',
    'stripe.webhook',
    'slack.command',
    'custom'
  ]),
  event: z.string(),
  data: z.record(z.unknown()),
  signature: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// ============================================================================
// Decision Schemas
// ============================================================================

export const decisionProposalSchema = z.object({
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
  task_id: uuidSchema.optional(),
  category: decisionCategorySchema,
  title: z.string().min(1).max(500),
  description: z.string(),
  proposed_action: z.record(z.unknown()),
  reasoning: z.object({
    context: z.string(),
    analysis: z.string(),
    options_considered: z.array(z.object({
      description: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      estimated_outcome: z.string(),
      confidence: z.number().min(0).max(1),
    })).optional(),
    confidence: z.number().min(0).max(1),
    risks: z.array(z.object({
      description: z.string(),
      likelihood: z.enum(['low', 'medium', 'high']),
      impact: z.enum(['low', 'medium', 'high']),
      mitigation: z.string().optional(),
    })).optional(),
  }),
  self_authorized: z.boolean().default(false),
  required_capability: z.string().optional(),
});

export type DecisionProposal = z.infer<typeof decisionProposalSchema>;

// ============================================================================
// Escalation Schemas
// ============================================================================

export const escalationRequestSchema = z.object({
  tenant_id: uuidSchema,
  agent_id: uuidSchema,
  task_id: uuidSchema.optional(),
  type: escalationTypeSchema,
  urgency: escalationUrgencySchema.default('normal'),
  title: z.string().min(1).max(500),
  description: z.string(),
  situation_context: z.object({
    current_task_id: uuidSchema.optional(),
    relevant_history: z.array(z.string()).optional(),
  }).default({}),
  question: z.object({
    title: z.string(),
    details: z.string(),
    options: z.array(z.string()).optional(),
  }),
  agent_analysis: z.object({
    what_i_know: z.string(),
    what_i_dont_know: z.string(),
    what_i_tried: z.array(z.string()),
    suggested_resolution: z.string().optional(),
  }),
});

export type EscalationRequest = z.infer<typeof escalationRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const protocolErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  retry_after_seconds: z.number().optional(),
});

export const runtimeResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: protocolErrorSchema.optional(),
});

// ============================================================================
// API Request Schemas
// ============================================================================

export const apiRequestSchema = z.object({
  action: z.string(),
  payload: z.record(z.unknown()),
  request_id: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type ApiRequest = z.infer<typeof apiRequestSchema>;

// ============================================================================
// Database Row Types (for Supabase queries)
// ============================================================================

export interface AgentRow {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  root_id: string;
  depth: number;
  name: string;
  role: string;
  status: string;
  capabilities: string[];
  description?: string;
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee_id?: string;
  assigner_id?: string;
  parent_task_id?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  progress_percent?: number;
  outputs?: Record<string, unknown>;
}

export interface MessageRow {
  id: string;
  tenant_id: string;
  protocol_version: string;
  message_type: string;
  from_agent_id?: string;
  to_agent_id?: string | null;
  to_broadcast: boolean;
  thread_id?: string;
  correlation_id?: string;
  payload: Record<string, unknown>;
  priority: string;
  requires_ack: boolean;
  created_at: string;
}

export interface DecisionRow {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_id?: string;
  category: string;
  title: string;
  description: string;
  proposed_action: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
  self_authorized: boolean;
  status: string;
  proposed_at: string;
  executed_at?: string | null;
}

export interface EscalationRow {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_id?: string;
  type: string;
  urgency: string;
  status: string;
  title: string;
  description: string;
  question?: Record<string, unknown>;
  agent_analysis?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Daily cost RPC response type
export interface DailyCostRow {
  date: string;
  request_count: number | string;
  total_tokens: number | string;
  total_cost_usd: number | string;
}

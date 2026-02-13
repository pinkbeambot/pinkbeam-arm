import { z } from 'zod';
import { AgentRole, AgentStatus, TaskStatus, TaskPriority, DecisionCategory, EscalationType, EscalationUrgency } from '@/types';

// ============================================================================
// Agent Validation
// ============================================================================

export const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(100).optional(),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  capabilities: z.array(z.string()).optional(),
  llm_config: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
  }).optional(),
  limits: z.object({
    max_sub_agents: z.number().int().positive().optional(),
    escalation_threshold: z.number().min(0).max(1).optional(),
    timeout_seconds: z.number().int().positive().optional(),
    max_tokens_per_task: z.number().int().positive().optional(),
    max_cost_per_task_usd: z.number().positive().optional(),
  }).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated']).optional(),
  capabilities: z.array(z.string()).optional(),
  llm_config: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
  }).optional(),
  limits: z.object({
    max_sub_agents: z.number().int().positive().optional(),
    escalation_threshold: z.number().min(0).max(1).optional(),
    timeout_seconds: z.number().int().positive().optional(),
    max_tokens_per_task: z.number().int().positive().optional(),
    max_cost_per_task_usd: z.number().positive().optional(),
  }).optional(),
});

export const listAgentsQuerySchema = z.object({
  status: z.enum(['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated']).optional(),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']).optional(),
  search: z.string().optional(),
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
  inputs: z.record(z.unknown()).optional(),
  expected_outputs: z.record(z.unknown()).optional(),
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
  outputs: z.record(z.unknown()).optional(),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled']).optional(),
  assignee_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
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
  correct_action: z.record(z.unknown()).optional(),
});

export const listDecisionsQuerySchema = z.object({
  agent_id: z.string().uuid().optional(),
  status: z.enum(['proposed', 'approved', 'rejected', 'overridden', 'executed']).optional(),
  category: z.enum(['action', 'resource', 'escalation', 'strategy', 'system']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// Escalation Validation
// ============================================================================

export const resolveEscalationSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolution_type: z.string().optional(),
  resolution_answer: z.string().min(1),
  resolution_resources: z.record(z.unknown()).optional(),
  learning_notes: z.string().optional(),
});

export const listEscalationsQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// Activity Validation
// ============================================================================

export const listActivitiesQuerySchema = z.object({
  type: z.string().optional(),
  agent_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  before: z.string().optional(), // cursor
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type OverrideDecisionInput = z.infer<typeof overrideDecisionSchema>;
export type ListDecisionsQuery = z.infer<typeof listDecisionsQuerySchema>;

export type ResolveEscalationInput = z.infer<typeof resolveEscalationSchema>;
export type ListEscalationsQuery = z.infer<typeof listEscalationsQuerySchema>;

export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;

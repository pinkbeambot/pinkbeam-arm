/**
 * Agent Validation Schemas
 * 
 * Zod schemas for agent-related API requests.
 * These schemas define the shape and constraints for creating,
 * updating, and listing agents.
 */

import { z } from 'zod';

// ============================================================================
// Enums (matching database types)
// ============================================================================

export const AgentRoleEnum = z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']);
export const AgentStatusEnum = z.enum([
  'initializing',
  'idle',
  'active',
  'paused',
  'blocked',
  'error',
  'escaped',
  'terminated',
]);

// ============================================================================
// Sub-schemas (reusable components)
// ============================================================================

export const llmConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
});

export const limitsSchema = z.object({
  max_sub_agents: z.number().int().nonnegative().optional(),
  max_concurrent_tasks: z.number().int().nonnegative().optional(),
  escalation_threshold: z.number().min(0).max(1).optional(),
  timeout_seconds: z.number().int().positive().optional(),
  max_tokens_per_task: z.number().int().positive().optional(),
  max_cost_per_task_usd: z.number().nonnegative().optional(),
});

// ============================================================================
// Create Agent Schema
// ============================================================================

export const createAgentSchema = z.object({
  name: z.string()
    .min(1)
    .max(255),
  slug: z.string()
    .max(100)
    .regex(/^[a-z0-9-]*$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
    .optional(),
  role: AgentRoleEnum.default('worker'),
  description: z.string().max(2000).optional(),
  parent_id: z.string().uuid().optional(),
  capabilities: z.array(z.string()).optional(),
  llm_config: llmConfigSchema.optional(),
  limits: limitsSchema.optional(),
  // Template relationship
  template_id: z.string().uuid().optional(),
  // Initial config
  config: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

// ============================================================================
// Update Agent Schema
// ============================================================================

export const updateAgentSchema = z.object({
  name: z.string()
    .min(1)
    .max(255)
    .optional(),
  description: z.string().max(2000).optional(),
  role: AgentRoleEnum.optional(),
  status: AgentStatusEnum.optional(),
  status_reason: z.string().max(500).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  root_id: z.string().uuid().nullable().optional(),
  depth: z.number().int().nonnegative().optional(),
  capabilities: z.array(z.string()).optional(),
  llm_config: llmConfigSchema.partial().optional(),
  limits: limitsSchema.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// ============================================================================
// List Agents Query Schema
// ============================================================================

export const listAgentsQuerySchema = z.object({
  status: AgentStatusEnum.optional(),
  role: AgentRoleEnum.optional(),
  search: z.string().max(200).optional(),
  parent_id: z.string().uuid().optional(),
  include_descendants: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;

// ============================================================================
// Agent Hierarchy Schema
// ============================================================================

export const agentHierarchyQuerySchema = z.object({
  root_id: z.string().uuid(),
  max_depth: z.coerce.number().int().min(1).max(10).default(10),
  include_terminated: z.coerce.boolean().default(false),
});

export type AgentHierarchyQuery = z.infer<typeof agentHierarchyQuerySchema>;

// ============================================================================
// Agent Action Schemas
// ============================================================================

export const spawnAgentSchema = z.object({
  name: z.string().min(1).max(255),
  role: AgentRoleEnum,
  goal: z.string().min(1),
  context: z.object({
    task_description: z.string(),
    relevant_history: z.array(z.record(z.string(), z.unknown())).optional(),
    parent_context: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  config: z.object({
    capabilities: z.array(z.string()).optional(),
    model: z.string(),
    escalation_threshold: z.number().min(0).max(1).optional(),
    max_sub_agents: z.number().int().nonnegative().optional(),
    timeout_seconds: z.number().int().positive().optional(),
    budget: z.object({
      max_tokens: z.number().int().positive(),
      max_cost_usd: z.number().nonnegative(),
    }).optional(),
  }).optional(),
  parent_task_id: z.string().uuid().optional(),
});

export type SpawnAgentInput = z.infer<typeof spawnAgentSchema>;

export const agentActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'escape', 'return', 'restart']),
  reason: z.string().optional(),
});

export type AgentActionInput = z.infer<typeof agentActionSchema>;

// ============================================================================
// Re-export from main validation file for consistency
// ============================================================================

// These are the canonical schemas used in the API routes
export {
  createAgentSchema as createAgentSchemaCanonical,
  updateAgentSchema as updateAgentSchemaCanonical,
  listAgentsQuerySchema as listAgentsQuerySchemaCanonical,
} from '@/lib/validation';

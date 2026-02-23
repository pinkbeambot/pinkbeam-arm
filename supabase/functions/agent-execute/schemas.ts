/**
 * Agent Execute Schemas
 * 
 * Zod schemas for the agent-execute edge function
 */

import { z } from 'https://esm.sh/zod@3.22.4';

// ============================================================================
// Request Schemas
// ============================================================================

export const pickTaskRequestSchema = z.object({
  agent_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
});

export type PickTaskRequest = z.infer<typeof pickTaskRequestSchema>;

export const taskContextSchema = z.object({
  progress_percent: z.number().int().min(0).max(100).optional(),
  current_step: z.string().optional(),
  outputs: z.record(z.unknown()).optional(),
  error_message: z.string().optional(),
  escalate: z.boolean().optional(),
  tokens_used: z.number().int().optional(),
  cost_usd: z.number().optional(),
});

export type TaskContext = z.infer<typeof taskContextSchema>;

export const executeRequestSchema = z.object({
  agent_id: z.string().uuid(),
  task_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  action: z.enum(['start', 'execute', 'progress', 'complete', 'fail']),
  context: taskContextSchema.optional(),
});

export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

export const llmRequestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  system: z.string().optional(),
});

export type LLMRequest = z.infer<typeof llmRequestSchema>;

export const llmResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal('text'),
    text: z.string(),
  })),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
  }),
  id: z.string(),
  model: z.string(),
});

export type LLMResponse = z.infer<typeof llmResponseSchema>;

export const agentReasoningSchema = z.object({
  thought: z.string(),
  action: z.enum([
    'continue',
    'complete',
    'escalate',
    'spawn_subtask',
    'request_info',
    'fail'
  ]),
  action_params: z.record(z.unknown()).optional(),
  progress_percent: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
});

export type AgentReasoning = z.infer<typeof agentReasoningSchema>;

export const executionResultSchema = z.object({
  task_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  status: z.enum(['completed', 'failed', 'escalated']),
  outputs: z.record(z.unknown()).optional(),
  cost_usd: z.number(),
  tokens_used: z.number().int(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  execution_steps: z.number().int(),
  escalations_created: z.number().int(),
});

export type ExecutionResult = z.infer<typeof executionResultSchema>;

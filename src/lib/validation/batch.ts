/**
 * Batch Operations Validation Schemas
 * 
 * Zod schemas for bulk/batch API operations.
 */

import { z } from 'zod';
import { createAgentSchema, updateAgentSchema } from './agent';
import { createTaskSchema, updateTaskSchema } from './task';

// ============================================================================
// Agent Batch Operations
// ============================================================================

export const batchUpdateAgentItemSchema = z.object({
  id: z.string().uuid('Invalid agent ID format'),
  data: updateAgentSchema,
});

export const batchUpdateAgentsSchema = z.object({
  agents: z.array(batchUpdateAgentItemSchema)
    .min(1, 'At least one agent is required')
    .max(100, 'Cannot update more than 100 agents at once'),
});

export type BatchUpdateAgentItem = z.infer<typeof batchUpdateAgentItemSchema>;
export type BatchUpdateAgentsInput = z.infer<typeof batchUpdateAgentsSchema>;

// ============================================================================
// Task Batch Operations
// ============================================================================

export const batchCreateTaskItemSchema = createTaskSchema;

export const batchCreateTasksSchema = z.object({
  tasks: z.array(batchCreateTaskItemSchema)
    .min(1, 'At least one task is required')
    .max(100, 'Cannot create more than 100 tasks at once'),
  options: z.object({
    skip_validation: z.boolean().default(false),
    continue_on_error: z.boolean().default(false),
  }).optional(),
});

export const batchUpdateTaskItemSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
  data: updateTaskSchema,
});

export const batchUpdateTasksSchema = z.object({
  tasks: z.array(batchUpdateTaskItemSchema)
    .min(1, 'At least one task is required')
    .max(100, 'Cannot update more than 100 tasks at once'),
  options: z.object({
    continue_on_error: z.boolean().default(false),
  }).optional(),
});

export const batchAssignTaskItemSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
  assignee_id: z.string().uuid('Invalid assignee ID format'),
  note: z.string().max(1000).optional(),
});

export const batchAssignTasksSchema = z.object({
  assignments: z.array(batchAssignTaskItemSchema)
    .min(1, 'At least one assignment is required')
    .max(100, 'Cannot assign more than 100 tasks at once'),
  options: z.object({
    continue_on_error: z.boolean().default(false),
    unassign_existing: z.boolean().default(false),
  }).optional(),
});

export type BatchCreateTaskItem = z.infer<typeof batchCreateTaskItemSchema>;
export type BatchCreateTasksInput = z.infer<typeof batchCreateTasksSchema>;
export type BatchUpdateTaskItem = z.infer<typeof batchUpdateTaskItemSchema>;
export type BatchUpdateTasksInput = z.infer<typeof batchUpdateTasksSchema>;
export type BatchAssignTaskItem = z.infer<typeof batchAssignTaskItemSchema>;
export type BatchAssignTasksInput = z.infer<typeof batchAssignTasksSchema>;

// ============================================================================
// Batch Operation Results
// ============================================================================

export const batchOperationResultSchema = z.object({
  success: z.boolean(),
  processed: z.number().int(),
  succeeded: z.number().int(),
  failed: z.number().int(),
  errors: z.array(z.object({
    index: z.number().int(),
    id: z.string().optional(),
    message: z.string(),
    code: z.string().optional(),
  })),
  data: z.array(z.unknown()).optional(),
});

export type BatchOperationResult = z.infer<typeof batchOperationResultSchema>;

/**
 * Batch Operations Validation Schemas
 */

import { z } from 'zod';
import { updateAgentSchema } from './agent';
import { createTaskSchema, updateTaskSchema } from './task';

export const batchUpdateAgentItemSchema = z.object({
  id: z.string().uuid('Invalid agent ID format'),
  data: updateAgentSchema,
});

export const batchUpdateAgentsSchema = z.object({
  agents: z.array(batchUpdateAgentItemSchema)
    .min(1, 'At least one agent is required')
    .max(100, 'Cannot update more than 100 agents at once'),
});

export const batchCreateTasksSchema = z.object({
  tasks: z.array(createTaskSchema)
    .min(1, 'At least one task is required')
    .max(100, 'Cannot create more than 100 tasks at once'),
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

export type BatchUpdateAgentItem = z.infer<typeof batchUpdateAgentItemSchema>;
export type BatchUpdateAgentsInput = z.infer<typeof batchUpdateAgentsSchema>;
export type BatchCreateTasksInput = z.infer<typeof batchCreateTasksSchema>;
export type BatchAssignTaskItem = z.infer<typeof batchAssignTaskItemSchema>;
export type BatchAssignTasksInput = z.infer<typeof batchAssignTasksSchema>;

/**
 * Task Validation Schemas
 * 
 * Zod schemas for task-related validation.
 * These schemas enforce data integrity and provide type safety
 * for task CRUD operations.
 */

import { z } from 'zod';

// ============================================================================
// Task Status and Priority Enums
// ============================================================================

export const TaskStatus = {
  QUEUED: 'queued',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  REVIEW: 'review',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const TaskPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const DependencyType = {
  BLOCKS: 'blocks',
  REQUIRES: 'requires',
  OPTIONAL: 'optional',
} as const;

// ============================================================================
// Task Creation
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less'),
  description: z.string()
    .max(10000, 'Description must be 10000 characters or less')
    .optional(),
  type: z.string()
    .max(100, 'Type must be 100 characters or less')
    .default('generic'),
  assignee_id: z.string()
    .uuid('Invalid assignee ID format')
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent'])
    .default('normal'),
  parent_task_id: z.string()
    .uuid('Invalid parent task ID format')
    .optional(),
  inputs: z.record(z.string(), z.unknown())
    .optional(),
  expected_outputs: z.record(z.string(), z.unknown())
    .optional(),
  deadline_at: z.string()
    .datetime('Invalid deadline format. Use ISO 8601 format')
    .optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ============================================================================
// Task Update
// ============================================================================

export const updateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less')
    .optional(),
  description: z.string()
    .max(10000, 'Description must be 10000 characters or less')
    .optional(),
  status: z.enum(['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'])
    .optional(),
  assignee_id: z.string()
    .uuid('Invalid assignee ID format')
    .optional()
    .nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent'])
    .optional(),
  progress_percent: z.number()
    .int('Progress must be an integer')
    .min(0, 'Progress must be at least 0%')
    .max(100, 'Progress must be at most 100%')
    .optional(),
  current_step: z.string()
    .max(500, 'Current step must be 500 characters or less')
    .optional(),
  outputs: z.record(z.string(), z.unknown())
    .optional(),
  deadline_at: z.string()
    .datetime('Invalid deadline format. Use ISO 8601 format')
    .optional()
    .nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ============================================================================
// Task Status Transition
// ============================================================================

export const taskStatusTransitionSchema = z.object({
  status: z.enum(['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled']),
  reason: z.string()
    .max(1000, 'Reason must be 1000 characters or less')
    .optional(),
});

export type TaskStatusTransitionInput = z.infer<typeof taskStatusTransitionSchema>;

// ============================================================================
// Task Assignment
// ============================================================================

export const assignTaskSchema = z.object({
  assignee_id: z.string()
    .uuid('Invalid assignee ID format'),
  note: z.string()
    .max(1000, 'Note must be 1000 characters or less')
    .optional(),
});

export const unassignTaskSchema = z.object({
  reason: z.string()
    .max(1000, 'Reason must be 1000 characters or less')
    .optional(),
});

export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type UnassignTaskInput = z.infer<typeof unassignTaskSchema>;

// ============================================================================
// Task Dependencies
// ============================================================================

export const createDependencySchema = z.object({
  depends_on_task_id: z.string()
    .uuid('Invalid dependency task ID format'),
  dependency_type: z.enum(['blocks', 'requires', 'optional'])
    .default('blocks'),
});

export const removeDependencySchema = z.object({
  dependency_id: z.string()
    .uuid('Invalid dependency ID format')
    .optional(),
  depends_on_task_id: z.string()
    .uuid('Invalid dependency task ID format')
    .optional(),
}).refine(
  (data) => data.dependency_id || data.depends_on_task_id,
  {
    message: 'Either dependency_id or depends_on_task_id is required',
    path: ['dependency_id'],
  }
);

export type CreateDependencyInput = z.infer<typeof createDependencySchema>;
export type RemoveDependencyInput = z.infer<typeof removeDependencySchema>;

// ============================================================================
// Task Queries
// ============================================================================

export const listTasksQuerySchema = z.object({
  status: z.enum(['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'])
    .optional(),
  assignee_id: z.string()
    .uuid('Invalid assignee ID format')
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent'])
    .optional(),
  due_after: z.string()
    .datetime('Invalid date format')
    .optional(),
  due_before: z.string()
    .datetime('Invalid date format')
    .optional(),
  page: z.coerce.number()
    .int('Page must be an integer')
    .positive('Page must be positive')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .positive('Limit must be positive')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
}).refine(
  (data) => {
    if (data.due_after && data.due_before) {
      return new Date(data.due_before) > new Date(data.due_after);
    }
    return true;
  },
  {
    message: 'due_before must be after due_after',
    path: ['due_before'],
  }
);

export const enhancedListTasksQuerySchema = z.object({
  // Single or multiple statuses (comma-separated)
  status: z.string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const statuses = val.split(',').map(s => s.trim()).filter(Boolean);
      const validStatuses = ['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'];
      return statuses.filter(s => validStatuses.includes(s));
    }),
  priority: z.enum(['low', 'normal', 'high', 'urgent'])
    .optional(),
  agent_id: z.string()
    .uuid('Invalid agent ID format')
    .optional(),
  assignee_id: z.string()
    .uuid('Invalid assignee ID format')
    .optional(),
  parent_id: z.string()
    .uuid('Invalid parent ID format')
    .optional()
    .nullable(),
  due_before: z.string()
    .datetime('Invalid date format')
    .optional(),
  due_after: z.string()
    .datetime('Invalid date format')
    .optional(),
  search: z.string()
    .min(1, 'Search term is required')
    .max(200, 'Search term must be 200 characters or less')
    .optional(),
  sort: z.enum(['created_at', 'updated_at', 'deadline_at', 'priority'])
    .default('created_at'),
  order: z.enum(['asc', 'desc'])
    .default('desc'),
  page: z.coerce.number()
    .int('Page must be an integer')
    .positive('Page must be positive')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .positive('Limit must be positive')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

export const taskTreeQuerySchema = z.object({
  root_id: z.string()
    .uuid('Invalid root task ID format'),
  max_depth: z.coerce.number()
    .int('Max depth must be an integer')
    .min(1, 'Max depth must be at least 1')
    .max(10, 'Max depth cannot exceed 10')
    .default(10),
  include_completed: z.boolean()
    .default(true),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type EnhancedListTasksQuery = z.infer<typeof enhancedListTasksQuerySchema>;
export type TaskTreeQuery = z.infer<typeof taskTreeQuerySchema>;

// ============================================================================
// Batch Operations
// ============================================================================

export const batchCreateTaskSchema = z.object({
  tasks: z.array(createTaskSchema)
    .min(1, 'At least one task is required')
    .max(100, 'Cannot create more than 100 tasks at once'),
});

export const batchUpdateTaskItemSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
  data: updateTaskSchema,
});

export const batchUpdateTaskSchema = z.object({
  tasks: z.array(batchUpdateTaskItemSchema)
    .min(1, 'At least one task is required')
    .max(100, 'Cannot update more than 100 tasks at once'),
});

export const batchDeleteTaskSchema = z.object({
  ids: z.array(z.string().uuid('Invalid task ID format'))
    .min(1, 'At least one task ID is required')
    .max(100, 'Cannot delete more than 100 tasks at once'),
  force: z.boolean()
    .default(false), // Force delete even if in_progress
});

export type BatchCreateTaskInput = z.infer<typeof batchCreateTaskSchema>;
export type BatchUpdateTaskInput = z.infer<typeof batchUpdateTaskSchema>;
export type BatchDeleteTaskInput = z.infer<typeof batchDeleteTaskSchema>;

// ============================================================================
// Task Progress Update
// ============================================================================

export const updateTaskProgressSchema = z.object({
  progress_percent: z.number()
    .int('Progress must be an integer')
    .min(0, 'Progress must be at least 0%')
    .max(100, 'Progress must be at most 100%'),
  current_step: z.string()
    .max(500, 'Current step must be 500 characters or less')
    .optional(),
  outputs: z.record(z.string(), z.unknown())
    .optional(),
});

export type UpdateTaskProgressInput = z.infer<typeof updateTaskProgressSchema>;

// ============================================================================
// Task ID Parameter
// ============================================================================

export const taskIdParamSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;

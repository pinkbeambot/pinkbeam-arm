/**
 * Advanced Filtering Validation Schemas
 */

import { z } from 'zod';

export const SortOrderEnum = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderEnum>;

export const advancedAgentsQuerySchema = z.object({
  q: z.string().max(500).optional(),
  search_fields: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  include_descendants: z.coerce.boolean().default(false),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'status', 'role']).default('created_at'),
  sort_order: SortOrderEnum.default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  filters: z.string().optional(),
});

export const advancedTasksQuerySchema = z.object({
  q: z.string().max(500).optional(),
  search_fields: z.string().optional(),
  search_operator: z.enum(['and', 'or']).default('and'),
  status: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  due_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'deadline_at', 'priority', 'title']).default('created_at'),
  sort_order: SortOrderEnum.default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  filters: z.string().optional(),
});

export const advancedDecisionsQuerySchema = z.object({
  q: z.string().max(500).optional(),
  search_fields: z.string().optional(),
  search_operator: z.enum(['and', 'or']).default('and'),
  status: z.enum(['proposed', 'approved', 'rejected', 'overridden', 'executed']).optional(),
  category: z.enum(['action', 'resource', 'escalation', 'strategy', 'system']).optional(),
  agent_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  self_authorized: z.coerce.boolean().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'proposed_at', 'decided_at', 'confidence']).default('created_at'),
  sort_order: SortOrderEnum.default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  filters: z.string().optional(),
});

export type AdvancedAgentsQuery = z.infer<typeof advancedAgentsQuerySchema>;
export type AdvancedTasksQuery = z.infer<typeof advancedTasksQuerySchema>;
export type AdvancedDecisionsQuery = z.infer<typeof advancedDecisionsQuerySchema>;

/**
 * Advanced Filtering Validation Schemas
 * 
 * Zod schemas for complex query operations and full-text search.
 */

import { z } from 'zod';

// ============================================================================
// Sort Options
// ============================================================================

export const SortOrderEnum = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderEnum>;

// ============================================================================
// Pagination with Cursor
// ============================================================================

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

// ============================================================================
// Full-Text Search
// ============================================================================

export const fullTextSearchSchema = z.object({
  q: z.string().min(1).max(500).optional(),
  search_fields: z.string().optional().transform((val) => {
    if (!val) return undefined;
    return val.split(',').map(f => f.trim()).filter(Boolean);
  }),
  search_operator: z.enum(['and', 'or']).default('and'),
});

export type FullTextSearch = z.infer<typeof fullTextSearchSchema>;

// ============================================================================
// Complex Filter Operators
// ============================================================================

export const filterOperatorSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'eq',      // equals
    'neq',     // not equals
    'gt',      // greater than
    'gte',     // greater than or equal
    'lt',      // less than
    'lte',     // less than or equal
    'in',      // in array
    'nin',     // not in array
    'like',    // contains (case-insensitive)
    'nlike',   // not contains
    'is',      // is null / is not null
    'between', // between two values
  ]),
  value: z.unknown(),
});

export type FilterOperator = z.infer<typeof filterOperatorSchema>;

// ============================================================================
// Advanced Agents Query
// ============================================================================

export const advancedAgentsQuerySchema = z.object({
  // Full-text search
  q: z.string().max(500).optional(),
  search_fields: z.string().optional(),
  
  // Filters
  status: z.string().optional(), // Can be comma-separated for multiple
  role: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  include_descendants: z.coerce.boolean().default(false),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  
  // Sorting
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'status', 'role']).default('created_at'),
  sort_order: SortOrderEnum.default('desc'),
  
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  
  // Advanced
  filters: z.string().optional(), // JSON string of FilterOperator[]
});

export type AdvancedAgentsQuery = z.infer<typeof advancedAgentsQuerySchema>;

// ============================================================================
// Advanced Tasks Query
// ============================================================================

export const advancedTasksQuerySchema = z.object({
  // Full-text search
  q: z.string().max(500).optional(),
  search_fields: z.string().optional(),
  search_operator: z.enum(['and', 'or']).default('and'),
  
  // Filters
  status: z.string().optional(), // Can be comma-separated
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  due_before: z.string().datetime().optional(),
  
  // Sorting
  sort_by: z.enum(['created_at', 'updated_at', 'deadline_at', 'priority', 'title']).default('created_at'),
  sort_order: SortOrderEnum.default('desc'),
  
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  
  // Advanced
  filters: z.string().optional(),
});

export type AdvancedTasksQuery = z.infer<typeof advancedTasksQuerySchema>;

// ============================================================================
// Advanced Decisions Query
// ============================================================================

export const advancedDecisionsQuerySchema = z.object({
  // Full-text search
  q: z.string().max(500).optional(),
  search_fields: z.string().optional(),
  search_operator: z.enum(['and', 'or']).default('and'),
  
  // Filters
  status: z.enum(['proposed', 'approved', 'rejected', 'overridden', 'executed']).optional(),
  category: z.enum(['action', 'resource', 'escalation', 'strategy', 'system']).optional(),
  agent_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  self_authorized: z.coerce.boolean().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  
  // Sorting
  sort_by: z.enum(['created_at', 'proposed_at', 'decided_at', 'confidence']).default('created_at'),
  sort_order: SortOrderEnum.default('desc'),
  
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  
  // Advanced
  filters: z.string().optional(),
});

export type AdvancedDecisionsQuery = z.infer<typeof advancedDecisionsQuerySchema>;

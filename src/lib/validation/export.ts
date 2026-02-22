/**
 * Export API Validation Schemas
 * 
 * Zod schemas for data export operations.
 */

import { z } from 'zod';

// ============================================================================
// Export Format Types
// ============================================================================

export const ExportFormatEnum = z.enum(['csv', 'json', 'jsonl']);
export type ExportFormat = z.infer<typeof ExportFormatEnum>;

// ============================================================================
// Base Export Query Schema
// ============================================================================

export const baseExportQuerySchema = z.object({
  format: ExportFormatEnum.default('json'),
  include_metadata: z.coerce.boolean().default(true),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// ============================================================================
// Agents Export
// ============================================================================

export const exportAgentsQuerySchema = baseExportQuerySchema.extend({
  status: z.enum(['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated']).optional(),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']).optional(),
  parent_id: z.string().uuid().optional(),
  include_stats: z.coerce.boolean().default(false),
  include_inactive: z.coerce.boolean().default(false),
});

export type ExportAgentsQuery = z.infer<typeof exportAgentsQuerySchema>;

// ============================================================================
// Tasks Export
// ============================================================================

export const exportTasksQuerySchema = baseExportQuerySchema.extend({
  status: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const statuses = val.split(',').map(s => s.trim()).filter(Boolean);
    const validStatuses = ['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'];
    return statuses.filter(s => validStatuses.includes(s));
  }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional(),
  include_subtasks: z.coerce.boolean().default(true),
  include_outputs: z.coerce.boolean().default(false),
});

export type ExportTasksQuery = z.infer<typeof exportTasksQuerySchema>;

// ============================================================================
// Decisions Export
// ============================================================================

export const exportDecisionsQuerySchema = baseExportQuerySchema.extend({
  status: z.enum(['proposed', 'approved', 'rejected', 'overridden', 'executed']).optional(),
  category: z.enum(['action', 'resource', 'escalation', 'strategy', 'system']).optional(),
  agent_id: z.string().uuid().optional(),
  include_reasoning: z.coerce.boolean().default(true),
  include_outcome: z.coerce.boolean().default(true),
});

export type ExportDecisionsQuery = z.infer<typeof exportDecisionsQuerySchema>;

// ============================================================================
// Export Response
// ============================================================================

export const exportResponseSchema = z.object({
  success: z.boolean(),
  format: ExportFormatEnum,
  record_count: z.number().int(),
  filename: z.string(),
  expires_at: z.string().datetime().optional(),
  download_url: z.string().url().optional(),
  data: z.unknown().optional(), // For JSON responses
});

export type ExportResponse = z.infer<typeof exportResponseSchema>;

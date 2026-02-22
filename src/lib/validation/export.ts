/**
 * Export API Validation Schemas
 */

import { z } from 'zod';

export const ExportFormatEnum = z.enum(['csv', 'json', 'jsonl']);
export type ExportFormat = z.infer<typeof ExportFormatEnum>;

const baseExportQuerySchema = z.object({
  format: ExportFormatEnum.default('json'),
  include_metadata: z.coerce.boolean().default(true),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export const exportAgentsQuerySchema = baseExportQuerySchema.extend({
  status: z.enum(['initializing', 'idle', 'active', 'paused', 'blocked', 'error', 'escaped', 'terminated']).optional(),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']).optional(),
  include_inactive: z.coerce.boolean().default(false),
});

export const exportTasksQuerySchema = baseExportQuerySchema.extend({
  status: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const statuses = val.split(',').map(s => s.trim()).filter(Boolean);
    const validStatuses = ['queued', 'in_progress', 'blocked', 'review', 'completed', 'failed', 'cancelled'];
    return statuses.filter(s => validStatuses.includes(s));
  }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().optional(),
  include_outputs: z.coerce.boolean().default(false),
});

export const exportDecisionsQuerySchema = baseExportQuerySchema.extend({
  status: z.enum(['proposed', 'approved', 'rejected', 'overridden', 'executed']).optional(),
  category: z.enum(['action', 'resource', 'escalation', 'strategy', 'system']).optional(),
  agent_id: z.string().uuid().optional(),
  include_reasoning: z.coerce.boolean().default(true),
  include_outcome: z.coerce.boolean().default(true),
});

export type ExportAgentsQuery = z.infer<typeof exportAgentsQuerySchema>;
export type ExportTasksQuery = z.infer<typeof exportTasksQuerySchema>;
export type ExportDecisionsQuery = z.infer<typeof exportDecisionsQuerySchema>;

/**
 * Activity Validation Schemas
 *
 * Zod schemas for activity-related validation.
 */

import { z } from 'zod';

export const listActivitiesQuerySchema = z.object({
  // Filter by agent (actor or related agent)
  agent_id: z.string().uuid().optional(),

  // Filter by entity/category type (tasks, decisions, escalations, agents, system)
  entity_type: z.enum(['all', 'tasks', 'decisions', 'escalations', 'agents', 'system']).optional(),

  // Filter by specific action type
  action_type: z.enum([
    'agent.spawned', 'agent.status_changed', 'agent.terminated',
    'task.created', 'task.assigned', 'task.started', 'task.progress', 'task.completed', 'task.failed',
    'decision.proposed', 'decision.made', 'decision.overridden',
    'escalation.created', 'escalation.resolved',
    'message.sent', 'message.received',
    'system.error', 'system.config_changed'
  ]).optional(),

  // Time range shortcuts (mutually exclusive with date_from/date_to)
  time_range: z.enum(['1h', '24h', '7d', '30d', 'all']).optional(),

  // Explicit date range
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),

  // Search in title and description
  search: z.string().min(1).max(200).optional(),

  // Pagination (cursor-based using sequence_number)
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),

  // Legacy support
  type: z.string().optional(),
  before: z.string().optional(),
  category: z.string().optional(),
});

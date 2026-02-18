/**
 * Cost Validation Schemas
 *
 * Zod schemas for cost tracking and analytics.
 */

import { z } from 'zod';

export const listCostsQuerySchema = z.object({
  model: z.string().optional(),
  provider: z.enum(['anthropic', 'openai']).optional(),
  status: z.enum(['success', 'error', 'cached']).optional(),
  agent_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const costSummaryQuerySchema = z.object({
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export const dailyCostsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export type ListCostsQuery = z.infer<typeof listCostsQuerySchema>;
export type CostSummaryQuery = z.infer<typeof costSummaryQuerySchema>;
export type DailyCostsQuery = z.infer<typeof dailyCostsQuerySchema>;

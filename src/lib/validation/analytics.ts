/**
 * Analytics Validation Schemas
 *
 * Zod schemas for analytics-related validation.
 */

import { z } from 'zod';

export const analyticsOverviewQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export const analyticsLeaderboardQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
  sortBy: z.enum(['tasksCompleted', 'successRate', 'avgDuration', 'cost']).default('tasksCompleted'),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const analyticsAgentQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

export const analyticsRoiQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
  hourlyRate: z.coerce.number().positive().default(50),
});

export const analyticsBottlenecksQuerySchema = z.object({
  hours: z.coerce.number().int().positive().max(168).default(24),
});

export type AnalyticsOverviewQuery = z.infer<typeof analyticsOverviewQuerySchema>;
export type AnalyticsLeaderboardQuery = z.infer<typeof analyticsLeaderboardQuerySchema>;
export type AnalyticsAgentQuery = z.infer<typeof analyticsAgentQuerySchema>;
export type AnalyticsRoiQuery = z.infer<typeof analyticsRoiQuerySchema>;
export type AnalyticsBottlenecksQuery = z.infer<typeof analyticsBottlenecksQuerySchema>;

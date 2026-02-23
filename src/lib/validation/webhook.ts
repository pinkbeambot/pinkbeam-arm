/**
 * Webhook Validation Schemas
 *
 * Zod schemas for webhook endpoint management.
 */

import { z } from 'zod';
import { WEBHOOK_EVENT_FILTERS } from '@/types/webhook';

const eventEnum = z.enum(WEBHOOK_EVENT_FILTERS as unknown as [string, ...string[]]);

export const createWebhookEndpointSchema = z.object({
  url: z.string().url(),
  description: z.string().max(500).optional(),
  events: z.array(eventEnum).min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateWebhookEndpointSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  events: z.array(eventEnum).min(1).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const testWebhookSchema = z.object({
  endpoint_id: z.string().uuid(),
});

export const listWebhookDeliveriesQuerySchema = z.object({
  endpoint_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'success', 'failed', 'expired']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;
export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;
export type TestWebhookInput = z.infer<typeof testWebhookSchema>;
export type ListWebhookDeliveriesQuery = z.infer<typeof listWebhookDeliveriesQuerySchema>;

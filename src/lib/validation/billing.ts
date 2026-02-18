/**
 * Billing Validation Schemas
 *
 * Zod schemas for billing-related validation.
 */

import { z } from 'zod';

export const createCheckoutSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export const updateSubscriptionSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const listInvoicesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']).optional(),
});

export const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string().startsWith('pm_'),
  setAsDefault: z.boolean().optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;

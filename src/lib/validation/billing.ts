/**
 * Billing Validation Schemas
 *
 * Zod schemas for billing-related validation.
 */

import { z } from 'zod';

// ============================================================================
// Checkout & Portal
// ============================================================================

export const createCheckoutSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

// ============================================================================
// Subscription Management
// ============================================================================

export const updateSubscriptionSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const upgradePreviewSchema = z.object({
  targetTier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
});

export const subscriptionChangeSchema = z.object({
  changeType: z.enum(['upgrade', 'downgrade', 'cancellation', 'reactivation']),
  targetTier: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'enterprise']),
  reason: z.string().optional(),
});

// ============================================================================
// Cancellation & Retention
// ============================================================================

export const cancellationRequestSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason is too long'),
  feedback: z.object({
    tooExpensive: z.boolean().optional(),
    missingFeatures: z.boolean().optional(),
    switchedCompetitor: z.boolean().optional(),
    notUsing: z.boolean().optional(),
    otherReason: z.string().optional(),
  }).optional(),
});

export const retentionResponseSchema = z.object({
  retentionId: z.string().uuid(),
  accepted: z.boolean(),
  offerType: z.enum(['discount', 'extended_trial', 'pause', 'downgrade']),
});

// ============================================================================
// Invoices
// ============================================================================

export const listInvoicesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']).optional(),
});

export const generateInvoicePdfSchema = z.object({
  invoiceId: z.string().uuid(),
});

// ============================================================================
// Payment Methods
// ============================================================================

export const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string().startsWith('pm_'),
  setAsDefault: z.boolean().optional(),
});

export const updatePaymentMethodSchema = z.object({
  paymentMethodId: z.string().startsWith('pm_'),
  setAsDefault: z.boolean(),
  autoUpdateEnabled: z.boolean().optional(),
});

export const deletePaymentMethodSchema = z.object({
  paymentMethodId: z.string().startsWith('pm_'),
});

// ============================================================================
// Usage Tracking
// ============================================================================

export const recordUsageSchema = z.object({
  metricType: z.enum(['agent', 'task', 'storage', 'llm_tokens', 'api_calls', 'compute']),
  metricName: z.string().min(1).max(100),
  usageCount: z.number().int().min(0),
  usageCostCents: z.number().int().min(0).default(0),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const usageQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metricType: z.enum(['agent', 'task', 'storage', 'llm_tokens', 'api_calls', 'compute']).optional(),
});

export const createUsageAlertSchema = z.object({
  alertType: z.enum(['usage_threshold', 'cost_threshold', 'limit_approaching']),
  metricType: z.enum(['agent', 'task', 'storage', 'cost']),
  thresholdPercent: z.number().int().min(1).max(100),
  notificationChannels: z.array(z.enum(['email', 'in_app', 'slack'])).default(['email', 'in_app']),
});

export const acknowledgeAlertSchema = z.object({
  alertId: z.string().uuid(),
});

// ============================================================================
// Failed Payments
// ============================================================================

export const retryPaymentSchema = z.object({
  failedPaymentId: z.string().uuid(),
  paymentMethodId: z.string().startsWith('pm_').optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type UpgradePreviewInput = z.infer<typeof upgradePreviewSchema>;
export type SubscriptionChangeInput = z.infer<typeof subscriptionChangeSchema>;
export type CancellationRequestInput = z.infer<typeof cancellationRequestSchema>;
export type RetentionResponseInput = z.infer<typeof retentionResponseSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type GenerateInvoicePdfInput = z.infer<typeof generateInvoicePdfSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type DeletePaymentMethodInput = z.infer<typeof deletePaymentMethodSchema>;
export type RecordUsageInput = z.infer<typeof recordUsageSchema>;
export type UsageQueryInput = z.infer<typeof usageQuerySchema>;
export type CreateUsageAlertInput = z.infer<typeof createUsageAlertSchema>;
export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type RetryPaymentInput = z.infer<typeof retryPaymentSchema>;

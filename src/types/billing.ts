/**
 * Billing and Subscription Types
 * Stripe billing integration for ARM
 */

// ============================================================================
// Subscription Tiers
// ============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'scale' | 'enterprise';
export type SubscriptionStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'unpaid' 
  | 'paused';

export interface SubscriptionTierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  stripePriceId: string;
  stripePriceIdLive?: string;
  priceMonthly: number; // in cents
  agentLimit: number | null; // null means unlimited
  taskLimit: number | null;
  storageLimitMb: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

// ============================================================================
// Tenant Billing
// ============================================================================

export interface TenantBilling {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentTier: SubscriptionTier;
  trialEndsAt: string | null;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface TenantWithBilling extends TenantBilling {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Usage & Limits
// ============================================================================

export interface TenantUsage {
  agentCount: number;
  taskCount: number;
  fileCount: number;
  storageUsedMb: number;
}

export interface UsageLimits {
  agentLimit: number | null;
  taskLimit: number | null;
  storageLimitMb: number | null;
}

export interface UsageWithLimits extends TenantUsage, UsageLimits {
  agentsUsedPercent: number | null;
  tasksUsedPercent: number | null;
  storageUsedPercent: number | null;
}

// ============================================================================
// Checkout & Portal
// ============================================================================

export interface CreateCheckoutSessionRequest {
  tier: SubscriptionTier;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CreatePortalSessionRequest {
  returnUrl?: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

// ============================================================================
// Invoices
// ============================================================================

export interface Invoice {
  id: string;
  stripeInvoiceId: string;
  amountDue: number; // cents
  amountPaid: number; // cents
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  invoicePdfUrl: string | null;
  hostedInvoiceUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ============================================================================
// Billing Events
// ============================================================================

export type BillingEventType = 
  | 'trial_started'
  | 'trial_ended'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_paid'
  | 'invoice_payment_failed';

export interface BillingEvent {
  id: string;
  tenantId: string;
  eventType: BillingEventType;
  stripeEventId: string | null;
  stripeEventType: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// Plan Comparison
// ============================================================================

export interface PlanFeature {
  name: string;
  description: string;
  starter: boolean | string;
  pro: boolean | string;
  business: boolean | string;
  scale: boolean | string;
}

// ============================================================================
// Webhook Events
// ============================================================================

export interface StripeWebhookPayload {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// Base tenant type needed for billing
interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

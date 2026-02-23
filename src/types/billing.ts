/**
 * Billing and Subscription Types
 * Enhanced Stripe billing integration for ARM with usage tracking and subscription management
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
// Enhanced Usage Tracking
// ============================================================================

export type MetricType = 'agent' | 'task' | 'storage' | 'llm_tokens' | 'api_calls' | 'compute';

export interface UsageTracking {
  id: string;
  tenantId: string;
  metricType: MetricType;
  metricName: string;
  usageCount: number;
  usageCostCents: number;
  recordedAt: string;
  periodStart: string;
  periodEnd: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UsageSummary {
  metricType: MetricType;
  metricName: string;
  totalUsage: number;
  totalCostCents: number;
}

export interface UsageDashboardData {
  currentPeriod: {
    start: string;
    end: string;
  };
  summary: UsageSummary[];
  trends: {
    daily: DailyUsageTrend[];
  };
  costs: {
    subscriptionCents: number;
    usageCents: number;
    totalCents: number;
  };
}

export interface DailyUsageTrend {
  date: string;
  metricType: MetricType;
  metricName: string;
  usageCount: number;
  costCents: number;
}

// ============================================================================
// Usage Alerts
// ============================================================================

export type AlertType = 'usage_threshold' | 'cost_threshold' | 'limit_approaching';

export interface UsageAlert {
  id: string;
  tenantId: string;
  alertType: AlertType;
  metricType: MetricType;
  thresholdPercent: number;
  isTriggered: boolean;
  triggeredAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  notificationSentAt: string | null;
  notificationChannels: string[];
  createdAt: string;
}

export interface UsageAlertWithCurrentValue extends UsageAlert {
  currentPercent: number;
  currentValue: number;
  limit: number | null;
}

// ============================================================================
// Subscription Management
// ============================================================================

export type SubscriptionChangeType = 'upgrade' | 'downgrade' | 'cancellation' | 'reactivation';
export type SubscriptionChangeStatus = 'pending' | 'applied' | 'failed' | 'rolled_back';

export interface SubscriptionChange {
  id: string;
  tenantId: string;
  changeType: SubscriptionChangeType;
  previousTier: SubscriptionTier;
  newTier: SubscriptionTier;
  prorationDate: string | null;
  prorationCreditCents: number | null;
  prorationChargeCents: number | null;
  stripeSubscriptionId: string | null;
  stripeInvoiceId: string | null;
  status: SubscriptionChangeStatus;
  appliedAt: string | null;
  initiatedBy: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlanComparison {
  currentTier: SubscriptionTierConfig;
  targetTier: SubscriptionTierConfig;
  prorationEstimate: {
    creditCents: number;
    chargeCents: number;
    netAmountCents: number;
    effectiveDate: string;
  } | null;
  featureChanges: {
    added: string[];
    removed: string[];
    changed: Array<{
      feature: string;
      oldValue: string | number | boolean;
      newValue: string | number | boolean;
    }>;
  };
}

export interface UpgradePreviewRequest {
  targetTier: SubscriptionTier;
}

export interface UpgradePreviewResponse {
  comparison: PlanComparison;
  canUpgrade: boolean;
  blockingReason?: string;
}

// ============================================================================
// Cancellation & Retention
// ============================================================================

export type RetentionOfferType = 'discount' | 'extended_trial' | 'pause' | 'downgrade';
export type CancellationStatus = 'retained' | 'cancelled' | 'paused';

export interface CancellationRetention {
  id: string;
  tenantId: string;
  initiatedAt: string;
  initiatedBy: string | null;
  retentionOffered: boolean;
  retentionOfferType: RetentionOfferType | null;
  retentionOfferDetails: Record<string, unknown> | null;
  userResponse: 'accepted' | 'declined' | 'pending' | null;
  respondedAt: string | null;
  finalStatus: CancellationStatus | null;
  completedAt: string | null;
  cancellationReason: string | null;
  feedbackSurvey: Record<string, unknown> | null;
}

export interface RetentionOffer {
  type: RetentionOfferType;
  title: string;
  description: string;
  details: {
    discountPercent?: number;
    monthsDuration?: number;
    pauseDays?: number;
    downgradeTo?: SubscriptionTier;
  };
}

export interface CancellationRequest {
  reason: string;
  feedback?: {
    tooExpensive?: boolean;
    missingFeatures?: boolean;
    switchedCompetitor?: boolean;
    notUsing?: boolean;
    otherReason?: string;
  };
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
// Enhanced Invoices
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

export type InvoiceLineItemType = 'subscription' | 'usage' | 'proration' | 'discount' | 'tax';

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  stripeLineItemId: string | null;
  description: string;
  amountCents: number;
  quantity: number;
  unitPriceCents: number | null;
  itemType: InvoiceLineItemType;
  featureCode: string | null;
  usageQuantity: number | null;
  usageUnit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  metadata: Record<string, unknown>;
}

export interface InvoiceWithDetails extends Invoice {
  lineItems: InvoiceLineItem[];
  usageBreakdown: {
    featureCode: string;
    description: string;
    quantity: number;
    unit: string;
    costCents: number;
  }[];
}

export interface GeneratedInvoice {
  id: string;
  invoiceId: string;
  pdfUrl: string | null;
  storagePath: string | null;
  generatedAt: string;
  generatedBy: string | null;
  fileSizeBytes: number | null;
  pageCount: number | null;
  downloadCount: number;
  lastDownloadedAt: string | null;
}

// ============================================================================
// Enhanced Payment Methods
// ============================================================================

export type PaymentMethodStatus = 'active' | 'expired' | 'expiring_soon' | 'failed' | 'removed';

export interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: string;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
  billingDetails: Record<string, unknown>;
  status: PaymentMethodStatus;
  failedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  autoUpdateEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodEvent {
  id: string;
  paymentMethodId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  stripeEventId: string | null;
  createdAt: string;
}

export interface AddPaymentMethodRequest {
  paymentMethodId: string;
  setAsDefault?: boolean;
}

// ============================================================================
// Failed Payment Handling
// ============================================================================

export type FailedPaymentStatus = 'pending' | 'retrying' | 'resolved' | 'finalized' | 'forgiven';
export type FailedPaymentResolution = 'retry_success' | 'new_payment_method' | 'manual_payment' | 'forgiven';

export interface FailedPayment {
  id: string;
  tenantId: string;
  stripeInvoiceId: string;
  stripePaymentIntentId: string | null;
  stripePaymentMethodId: string | null;
  amountCents: number;
  currency: string;
  failureCode: string | null;
  failureMessage: string | null;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  status: FailedPaymentStatus;
  resolvedAt: string | null;
  resolutionType: FailedPaymentResolution | null;
  dunningEmailSentAt: string | null;
  dunningEmailOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_paid'
  | 'invoice_payment_failed'
  | 'payment_method_added'
  | 'payment_method_updated'
  | 'payment_method_expired'
  | 'payment_method_removed'
  | 'usage_alert_triggered'
  | 'retention_offer_accepted'
  | 'cancellation_initiated'
  | 'cancellation_completed';

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
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  business: boolean | string;
  scale: boolean | string;
  enterprise: boolean | string;
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

// ============================================================================
// Billing Dashboard
// ============================================================================

export interface BillingDashboardData {
  subscription: {
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    trialEndsAt: string | null;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    daysUntilRenewal: number;
  };
  usage: UsageWithLimits;
  alerts: UsageAlertWithCurrentValue[];
  recentInvoices: Invoice[];
  paymentMethods: PaymentMethod[];
  upcomingInvoice: {
    amountDueCents: number;
    periodStart: string;
    periodEnd: string;
    lineItems: {
      description: string;
      amountCents: number;
    }[];
  } | null;
}

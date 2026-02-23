/**
 * Billing Service
 * Server-side billing operations using Supabase service role client.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AGENT_LIMITS } from './stripe';
import type {
  TenantBilling,
  TenantUsage,
  UsageWithLimits,
  SubscriptionTier,
  SubscriptionTierConfig,
  Invoice,
  BillingEventType,
} from '@/types/billing';

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

// ============================================================================
// Tenant Billing
// ============================================================================

export async function getTenantBilling(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantBilling | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select(
      'stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, current_tier, trial_ends_at, current_period_starts_at, current_period_ends_at, cancel_at_period_end'
    )
    .eq('id', tenantId)
    .single();

  if (error || !data) return null;

  return {
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    subscriptionStatus: data.subscription_status ?? 'trialing',
    currentTier: data.current_tier ?? 'starter',
    trialEndsAt: data.trial_ends_at,
    currentPeriodStartsAt: data.current_period_starts_at,
    currentPeriodEndsAt: data.current_period_ends_at,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  };
}

export async function updateTenantBilling(
  supabase: SupabaseClient,
  tenantId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId);

  if (error) {
    console.error('Failed to update tenant billing:', error);
    throw new Error('Failed to update tenant billing');
  }
}

// ============================================================================
// Usage
// ============================================================================

export async function getTenantUsage(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantUsage> {
  const { data, error } = await supabase.rpc('get_tenant_usage', {
    p_tenant_id: tenantId,
  });

  if (error || !data || data.length === 0) {
    return { agentCount: 0, taskCount: 0, fileCount: 0, storageUsedMb: 0 };
  }

  const row = data[0];
  return {
    agentCount: Number(row.agent_count) || 0,
    taskCount: Number(row.task_count) || 0,
    fileCount: Number(row.file_count) || 0,
    storageUsedMb: Number(row.storage_used_mb) || 0,
  };
}

export async function getUsageWithLimits(
  supabase: SupabaseClient,
  tenantId: string,
  tier: SubscriptionTier
): Promise<UsageWithLimits> {
  const usage = await getTenantUsage(supabase, tenantId);
  const tierConfig = await getSubscriptionTier(supabase, tier);

  const agentLimit = tierConfig?.agentLimit ?? AGENT_LIMITS[tier] ?? 3;
  const taskLimit = tierConfig?.taskLimit ?? null;
  const storageLimitMb = tierConfig?.storageLimitMb ?? null;

  return {
    ...usage,
    agentLimit,
    taskLimit,
    storageLimitMb,
    agentsUsedPercent: agentLimit ? Math.round((usage.agentCount / agentLimit) * 100) : null,
    tasksUsedPercent: taskLimit ? Math.round((usage.taskCount / taskLimit) * 100) : null,
    storageUsedPercent: storageLimitMb
      ? Math.round((usage.storageUsedMb / storageLimitMb) * 100)
      : null,
  };
}

export async function canCreateAgent(
  supabase: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_create_agent', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Failed to check agent limit:', error);
    return false;
  }

  return data === true;
}

// ============================================================================
// Subscription Tiers
// ============================================================================

export async function getSubscriptionTier(
  supabase: SupabaseClient,
  tierId: string
): Promise<SubscriptionTierConfig | null> {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (error || !data) return null;

  return mapTierRow(data);
}

export async function getAllSubscriptionTiers(
  supabase: SupabaseClient
): Promise<SubscriptionTierConfig[]> {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];

  return data.map(mapTierRow);
}

function mapTierRow(row: Record<string, unknown>): SubscriptionTierConfig {
  return {
    id: row.id as SubscriptionTier,
    name: row.name as string,
    description: (row.description as string) ?? '',
    stripePriceId: row.stripe_price_id as string,
    stripePriceIdLive: (row.stripe_price_id_live as string) ?? undefined,
    priceMonthly: row.price_monthly as number,
    agentLimit: row.agent_limit as number | null,
    taskLimit: row.task_limit as number | null,
    storageLimitMb: row.storage_limit_mb as number | null,
    features: (row.features as string[]) ?? [],
    isActive: (row.is_active as boolean) ?? true,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

// ============================================================================
// Invoices
// ============================================================================

export async function getRecentInvoices(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 10,
  status?: string
): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map(mapInvoiceRow);
}

export async function saveInvoice(
  supabase: SupabaseClient,
  tenantId: string,
  invoice: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('invoices').upsert(
    {
      tenant_id: tenantId,
      stripe_invoice_id: invoice.stripe_invoice_id,
      stripe_customer_id: invoice.stripe_customer_id,
      stripe_subscription_id: invoice.stripe_subscription_id,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency ?? 'usd',
      status: invoice.status,
      invoice_pdf_url: invoice.invoice_pdf_url,
      hosted_invoice_url: invoice.hosted_invoice_url,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      paid_at: invoice.paid_at,
    },
    { onConflict: 'stripe_invoice_id' }
  );

  if (error) {
    console.error('Failed to save invoice:', error);
  }
}

function mapInvoiceRow(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    stripeInvoiceId: row.stripe_invoice_id as string,
    amountDue: row.amount_due as number,
    amountPaid: row.amount_paid as number,
    currency: (row.currency as string) ?? 'usd',
    status: row.status as Invoice['status'],
    invoicePdfUrl: (row.invoice_pdf_url as string) ?? null,
    hostedInvoiceUrl: (row.hosted_invoice_url as string) ?? null,
    periodStart: (row.period_start as string) ?? null,
    periodEnd: (row.period_end as string) ?? null,
    paidAt: (row.paid_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// ============================================================================
// Billing Events
// ============================================================================

export async function logBillingEvent(
  supabase: SupabaseClient,
  tenantId: string,
  eventType: BillingEventType,
  data: Record<string, unknown>,
  stripeEventId?: string,
  stripeEventType?: string
): Promise<void> {
  const { error } = await supabase.from('billing_events').insert({
    tenant_id: tenantId,
    event_type: eventType,
    stripe_event_id: stripeEventId ?? null,
    stripe_event_type: stripeEventType ?? null,
    data,
  });

  if (error) {
    console.error('Failed to log billing event:', error);
  }
}

export async function getBillingEvents(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from('billing_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ============================================================================
// Tenant Lookup by Stripe IDs
// ============================================================================

export async function findTenantByStripeCustomerId(
  supabase: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function findTenantByStripeSubscriptionId(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (error || !data) return null;
  return data.id;
}

// ============================================================================
// Failed Payment Handling
// ============================================================================

export interface FailedPaymentInput {
  tenant_id: string;
  stripe_invoice_id: string;
  stripe_payment_intent_id: string | null;
  stripe_payment_method_id: string | null;
  amount_cents: number;
  currency: string;
  failure_code: string | null;
  failure_message: string | null;
  attempt_number: number;
  next_retry_at: string | null;
  status: string;
}

export async function createFailedPayment(
  supabase: SupabaseClient,
  input: FailedPaymentInput
): Promise<void> {
  const { error } = await supabase.from('failed_payments').upsert(
    {
      tenant_id: input.tenant_id,
      stripe_invoice_id: input.stripe_invoice_id,
      stripe_payment_intent_id: input.stripe_payment_intent_id,
      stripe_payment_method_id: input.stripe_payment_method_id,
      amount_cents: input.amount_cents,
      currency: input.currency,
      failure_code: input.failure_code,
      failure_message: input.failure_message,
      attempt_number: input.attempt_number,
      next_retry_at: input.next_retry_at,
      status: input.status,
    },
    { onConflict: 'stripe_invoice_id' }
  );

  if (error) {
    console.error('Failed to create failed payment record:', error);
  }
}

export async function updateFailedPaymentStatus(
  supabase: SupabaseClient,
  stripeInvoiceId: string,
  status: string,
  resolutionType?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    resolved_at: new Date().toISOString(),
  };

  if (resolutionType) {
    updates.resolution_type = resolutionType;
  }

  const { error } = await supabase
    .from('failed_payments')
    .update(updates)
    .eq('stripe_invoice_id', stripeInvoiceId);

  if (error) {
    console.error('Failed to update failed payment status:', error);
  }
}

export async function getFailedPayments(
  supabase: SupabaseClient,
  tenantId: string,
  status?: string
) {
  let query = supabase
    .from('failed_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get failed payments:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Payment Method Management
// ============================================================================

export interface PaymentMethodInput {
  tenant_id: string;
  stripe_payment_method_id: string;
  stripe_customer_id: string;
  type: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  billing_details: Record<string, unknown>;
  event_type?: string;
  event_data?: Record<string, unknown>;
}

export async function recordPaymentMethodEvent(
  supabase: SupabaseClient,
  input: PaymentMethodInput
): Promise<void> {
  // First, upsert the payment method
  const { data: existingMethod, error: fetchError } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('stripe_payment_method_id', input.stripe_payment_method_id)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch existing payment method:', fetchError);
  }

  let paymentMethodId = existingMethod?.id;

  if (!existingMethod) {
    // Create new payment method
    const { data: newMethod, error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        tenant_id: input.tenant_id,
        stripe_payment_method_id: input.stripe_payment_method_id,
        stripe_customer_id: input.stripe_customer_id,
        type: input.type,
        card_brand: input.card_brand,
        card_last4: input.card_last4,
        card_exp_month: input.card_exp_month,
        card_exp_year: input.card_exp_year,
        billing_details: input.billing_details,
        status: 'active',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert payment method:', insertError);
      return;
    }

    paymentMethodId = newMethod?.id;
  } else {
    // Update existing payment method status if needed
    if (input.event_type === 'failed') {
      await supabase
        .from('payment_methods')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_code: input.event_data?.failure_code,
          failure_message: input.event_data?.failure_message,
        })
        .eq('id', existingMethod.id);
    }
  }

  // Record the event
  if (paymentMethodId && input.event_type) {
    const { error: eventError } = await supabase.from('payment_method_events').insert({
      tenant_id: input.tenant_id,
      payment_method_id: paymentMethodId,
      event_type: input.event_type,
      event_data: input.event_data ?? {},
    });

    if (eventError) {
      console.error('Failed to record payment method event:', eventError);
    }
  }
}

export async function getPaymentMethods(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get payment methods:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Usage Tracking & Reconciliation
// ============================================================================

export interface UsageRecordInput {
  tenant_id: string;
  metric_type: string;
  metric_name: string;
  usage_count: number;
  usage_cost_cents: number;
  period_start: string;
  period_end: string;
  metadata?: Record<string, unknown>;
}

export async function recordUsage(
  supabase: SupabaseClient,
  input: UsageRecordInput
): Promise<string | null> {
  const { data, error } = await supabase.rpc('record_usage', {
    p_tenant_id: input.tenant_id,
    p_metric_type: input.metric_type,
    p_metric_name: input.metric_name,
    p_usage_count: input.usage_count,
    p_usage_cost_cents: input.usage_cost_cents,
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    console.error('Failed to record usage:', error);
    return null;
  }

  return data as string;
}

export async function getUsageSummary(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase.rpc('get_usage_summary', {
    p_tenant_id: tenantId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error('Failed to get usage summary:', error);
    return [];
  }

  return data || [];
}

export async function reconcileUsage(
  supabase: SupabaseClient,
  tenantId: string,
  periodStart: string,
  periodEnd: string,
  initiatedBy?: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('reconcile_usage', {
    p_tenant_id: tenantId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_initiated_by: initiatedBy,
  });

  if (error) {
    console.error('Failed to reconcile usage:', error);
    return null;
  }

  return data as string;
}

// ============================================================================
// Subscription Changes & Proration
// ============================================================================

export interface SubscriptionChangeInput {
  tenant_id: string;
  change_type: string;
  previous_tier: string;
  new_tier: string;
  proration_date?: string;
  proration_credit_cents?: number;
  proration_charge_cents?: number;
  stripe_subscription_id?: string;
  stripe_invoice_id?: string;
  status?: string;
  initiated_by?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function recordSubscriptionChange(
  supabase: SupabaseClient,
  input: SubscriptionChangeInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from('subscription_changes')
    .insert({
      tenant_id: input.tenant_id,
      change_type: input.change_type,
      previous_tier: input.previous_tier,
      new_tier: input.new_tier,
      proration_date: input.proration_date,
      proration_credit_cents: input.proration_credit_cents,
      proration_charge_cents: input.proration_charge_cents,
      stripe_subscription_id: input.stripe_subscription_id,
      stripe_invoice_id: input.stripe_invoice_id,
      status: input.status ?? 'pending',
      initiated_by: input.initiated_by,
      reason: input.reason,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to record subscription change:', error);
    return null;
  }

  return data?.id ?? null;
}

export async function calculateProration(
  supabase: SupabaseClient,
  tenantId: string,
  newTier: string
) {
  const { data, error } = await supabase.rpc('calculate_proration', {
    p_tenant_id: tenantId,
    p_new_tier: newTier,
  });

  if (error) {
    console.error('Failed to calculate proration:', error);
    return null;
  }

  return data?.[0] ?? null;
}

// ============================================================================
// Cancellation & Retention
// ============================================================================

export interface CancellationRequestInput {
  tenant_id: string;
  initiated_by: string;
  cancellation_reason: string;
  feedback_survey?: Record<string, unknown>;
}

export async function createCancellationRequest(
  supabase: SupabaseClient,
  input: CancellationRequestInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from('cancellation_retention')
    .insert({
      tenant_id: input.tenant_id,
      initiated_by: input.initiated_by,
      cancellation_reason: input.cancellation_reason,
      feedback_survey: input.feedback_survey ?? {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create cancellation request:', error);
    return null;
  }

  return data?.id ?? null;
}

export async function offerRetention(
  supabase: SupabaseClient,
  cancellationId: string,
  offerType: string,
  offerDetails: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('cancellation_retention')
    .update({
      retention_offered: true,
      retention_offer_type: offerType,
      retention_offer_details: offerDetails,
    })
    .eq('id', cancellationId);

  if (error) {
    console.error('Failed to offer retention:', error);
  }
}

export async function respondToRetention(
  supabase: SupabaseClient,
  cancellationId: string,
  accepted: boolean,
  finalStatus: string
): Promise<void> {
  const { error } = await supabase
    .from('cancellation_retention')
    .update({
      user_response: accepted ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
      final_status: finalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', cancellationId);

  if (error) {
    console.error('Failed to record retention response:', error);
  }
}

// ============================================================================
// Invoice Disputes
// ============================================================================

export interface InvoiceDisputeInput {
  tenant_id: string;
  invoice_id: string;
  dispute_type: string;
  description: string;
  requested_amount_cents?: number;
  requested_action?: string;
  priority?: string;
}

export async function createInvoiceDispute(
  supabase: SupabaseClient,
  input: InvoiceDisputeInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from('invoice_disputes')
    .insert({
      tenant_id: input.tenant_id,
      invoice_id: input.invoice_id,
      dispute_type: input.dispute_type,
      description: input.description,
      requested_amount_cents: input.requested_amount_cents,
      requested_action: input.requested_action,
      priority: input.priority ?? 'normal',
      status: 'open',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create invoice dispute:', error);
    return null;
  }

  return data?.id ?? null;
}

// ============================================================================
// Audit Logging
// ============================================================================

export interface AuditLogInput {
  tenant_id: string | null;
  event_category: string;
  event_type: string;
  event_action: string;
  actor_type: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  change_summary?: string;
  compliance_flags?: string[];
}

export async function createAuditLog(
  supabase: SupabaseClient,
  input: AuditLogInput
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_audit_log', {
    p_tenant_id: input.tenant_id,
    p_event_category: input.event_category,
    p_event_type: input.event_type,
    p_event_action: input.event_action,
    p_actor_type: input.actor_type,
    p_actor_id: input.actor_id,
    p_target_type: input.target_type,
    p_target_id: input.target_id,
    p_before_state: input.before_state ?? {},
    p_after_state: input.after_state ?? {},
    p_change_summary: input.change_summary,
    p_compliance_flags: input.compliance_flags,
  });

  if (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }

  return data as string;
}

// ============================================================================
// Tax Records
// ============================================================================

export interface TaxRecordInput {
  tenant_id: string;
  invoice_id: string;
  tax_type: string;
  tax_rate: number;
  tax_amount_cents: number;
  country_code: string;
  region_code?: string;
  tax_number?: string;
  tax_calculation_id?: string;
  evidence_data?: Record<string, unknown>;
}

export async function createTaxRecord(
  supabase: SupabaseClient,
  input: TaxRecordInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from('tax_records')
    .insert({
      tenant_id: input.tenant_id,
      invoice_id: input.invoice_id,
      tax_type: input.tax_type,
      tax_rate: input.tax_rate,
      tax_amount_cents: input.tax_amount_cents,
      country_code: input.country_code,
      region_code: input.region_code,
      tax_number: input.tax_number,
      tax_calculation_id: input.tax_calculation_id,
      evidence_data: input.evidence_data ?? {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create tax record:', error);
    return null;
  }

  return data?.id ?? null;
}

export async function getTaxRecords(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from('tax_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get tax records:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Trial Management
// ============================================================================

export async function handleTrialExpirations(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('handle_trial_expiration');

  if (error) {
    console.error('Failed to handle trial expirations:', error);
    return 0;
  }

  return data as number;
}

export async function extendTrial(
  supabase: SupabaseClient,
  tenantId: string,
  additionalDays: number
): Promise<boolean> {
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('trial_ends_at, subscription_status')
    .eq('id', tenantId)
    .single();

  if (fetchError || !tenant) {
    console.error('Failed to fetch tenant for trial extension:', fetchError);
    return false;
  }

  if (tenant.subscription_status !== 'trialing') {
    console.warn('Cannot extend trial: tenant is not in trial status');
    return false;
  }

  const currentEnd = new Date(tenant.trial_ends_at);
  const newEnd = new Date(currentEnd);
  newEnd.setDate(newEnd.getDate() + additionalDays);

  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      trial_ends_at: newEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId);

  if (updateError) {
    console.error('Failed to extend trial:', updateError);
    return false;
  }

  return true;
}

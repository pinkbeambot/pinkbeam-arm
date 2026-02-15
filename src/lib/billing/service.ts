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
  limit = 10
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

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

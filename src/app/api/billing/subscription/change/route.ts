import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { stripe } from '@/lib/billing/stripe';
import {
  getTenantBilling,
  getSubscriptionTier,
  recordSubscriptionChange,
  calculateProration,
  updateTenantBilling,
  logBillingEvent,
  createAuditLog,
} from '@/lib/billing/service';
import { upgradePreviewSchema, subscriptionChangeSchema } from '@/lib/validation/billing';
import { z } from 'zod';

/**
 * GET /api/billing/subscription/preview-upgrade
 * Get proration preview for upgrading to a different tier
 */
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const targetTier = searchParams.get('targetTier');

    if (!targetTier) {
      return NextResponse.json({ error: 'targetTier is required' }, { status: 400 });
    }

    // Validate target tier
    const validationResult = upgradePreviewSchema.safeParse({ targetTier });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const billing = await getTenantBilling(supabase, tenantId);
    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 });
    }

    // Get tier configs
    const [currentTierConfig, targetTierConfig] = await Promise.all([
      getSubscriptionTier(supabase, billing.currentTier),
      getSubscriptionTier(supabase, targetTier),
    ]);

    if (!currentTierConfig || !targetTierConfig) {
      return NextResponse.json({ error: 'Tier configuration not found' }, { status: 404 });
    }

    // Calculate proration
    const proration = await calculateProration(supabase, tenantId, targetTier);

    // Determine if upgrade or downgrade
    const isUpgrade = targetTierConfig.sortOrder > currentTierConfig.sortOrder;
    const isDowngrade = targetTierConfig.sortOrder < currentTierConfig.sortOrder;

    // Calculate feature changes
    const currentFeatures = new Set(currentTierConfig.features);
    const targetFeatures = new Set(targetTierConfig.features);

    const addedFeatures = targetTierConfig.features.filter((f) => !currentFeatures.has(f));
    const removedFeatures = currentTierConfig.features.filter((f) => !targetFeatures.has(f));

    return NextResponse.json({
      data: {
        currentTier: currentTierConfig,
        targetTier: targetTierConfig,
        changeType: isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'same',
        proration: proration
          ? {
              creditCents: proration.proration_credit_cents,
              chargeCents: proration.proration_charge_cents,
              netAmountCents: proration.net_amount_cents,
              effectiveDate: proration.days_remaining > 0 ? 'immediately' : 'next_period',
              daysRemainingInPeriod: proration.days_remaining,
            }
          : null,
        featureChanges: {
          added: addedFeatures,
          removed: removedFeatures,
          unchanged: currentTierConfig.features.filter((f) => targetFeatures.has(f)),
        },
        canChange: billing.subscriptionStatus === 'active' || billing.subscriptionStatus === 'trialing',
        blockingReason:
          billing.subscriptionStatus === 'past_due'
            ? 'Please update your payment method first'
            : billing.subscriptionStatus === 'canceled'
              ? 'Please create a new subscription'
              : undefined,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing/subscription/preview-upgrade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/billing/subscription/change
 * Handle plan upgrades/downgrades with proration
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    const body = await request.json();
    const validationResult = subscriptionChangeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { changeType, targetTier, reason } = validationResult.data;
    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const currentTier = billing.currentTier;

    // Get the new price ID
    const targetTierConfig = await getSubscriptionTier(supabase, targetTier);
    if (!targetTierConfig?.stripePriceId) {
      return NextResponse.json({ error: 'Invalid tier or missing price ID' }, { status: 400 });
    }

    // Record the subscription change attempt
    const changeRecordId = await recordSubscriptionChange(supabase, {
      tenant_id: tenantId,
      change_type: changeType,
      previous_tier: currentTier,
      new_tier: targetTier,
      initiated_by: userId,
      reason: reason ?? null,
      status: 'pending',
    });

    try {
      // Retrieve current subscription
      const subscription = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);

      if (!subscription.items.data.length) {
        return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 });
      }

      // Calculate proration
      const proration = await calculateProration(supabase, tenantId, targetTier);

      // Update subscription with new price
      const updatedSubscription = await stripe.subscriptions.update(
        billing.stripeSubscriptionId,
        {
          items: [{ id: subscription.items.data[0].id, price: targetTierConfig.stripePriceId }],
          metadata: { tenant_id: tenantId, tier: targetTier },
          proration_behavior: 'create_prorations',
        }
      );

      // Update tenant billing
      await updateTenantBilling(supabase, tenantId, {
        current_tier: targetTier,
        stripe_price_id: targetTierConfig.stripePriceId,
        subscription_status: updatedSubscription.status,
      });

      // Update subscription change record
      await supabase
        .from('subscription_changes')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          proration_date: new Date().toISOString(),
          proration_credit_cents: proration?.proration_credit_cents ?? null,
          proration_charge_cents: proration?.proration_charge_cents ?? null,
          stripe_subscription_id: updatedSubscription.id,
        })
        .eq('id', changeRecordId);

      // Log billing event
      await logBillingEvent(
        supabase,
        tenantId,
        changeType === 'upgrade' ? 'subscription_upgraded' : 'subscription_downgraded',
        {
          previous_tier: currentTier,
          new_tier: targetTier,
          change_id: changeRecordId,
          proration_credit: proration?.proration_credit_cents,
          proration_charge: proration?.proration_charge_cents,
        }
      );

      // Create audit log
      await createAuditLog(supabase, {
        tenant_id: tenantId,
        event_category: 'billing',
        event_type: 'subscription_change',
        event_action: changeType,
        actor_type: 'user',
        actor_id: userId,
        target_type: 'subscription',
        target_id: billing.stripeSubscriptionId,
        before_state: { tier: currentTier },
        after_state: { tier: targetTier },
        change_summary: `${changeType} from ${currentTier} to ${targetTier}`,
      });

      return NextResponse.json({
        data: {
          subscription: {
            id: updatedSubscription.id,
            status: updatedSubscription.status,
            tier: targetTier,
            currentPeriodStart: updatedSubscription.current_period_start
              ? new Date(updatedSubscription.current_period_start * 1000).toISOString()
              : null,
            currentPeriodEnd: updatedSubscription.current_period_end
              ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
              : null,
          },
          proration: proration
            ? {
                creditCents: proration.proration_credit_cents,
                chargeCents: proration.proration_charge_cents,
                netAmountCents: proration.net_amount_cents,
              }
            : null,
          changeId: changeRecordId,
        },
      });
    } catch (error) {
      // Mark change as failed
      await supabase
        .from('subscription_changes')
        .update({
          status: 'failed',
        })
        .eq('id', changeRecordId);

      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    console.error('Error in POST /api/billing/subscription/change:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

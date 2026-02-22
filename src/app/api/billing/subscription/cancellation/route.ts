import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { stripe } from '@/lib/billing/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  getTenantBilling,
  updateTenantBilling,
  logBillingEvent,
  createCancellationRequest,
  offerRetention,
  respondToRetention,
  extendTrial,
  createAuditLog,
} from '@/lib/billing/service';
import { cancellationRequestSchema, retentionResponseSchema } from '@/lib/validation/billing';
import { z } from 'zod';

/**
 * GET /api/billing/subscription/cancellation
 * Get cancellation preview with retention offers
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const billing = await getTenantBilling(supabase, tenantId);
    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 });
    }

    // Check if there's already a pending cancellation
    const { data: pendingCancellation } = await supabase
      .from('cancellation_retention')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('final_status', null)
      .order('initiated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate what happens on cancellation
    const effectiveDate = billing.currentPeriodEndsAt;
    const daysUntilEffective = effectiveDate
      ? Math.max(0, Math.ceil((new Date(effectiveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Determine available retention offers
    const retentionOffers = getRetentionOffers(billing);

    return NextResponse.json({
      data: {
        subscription: {
          status: billing.subscriptionStatus,
          tier: billing.currentTier,
          currentPeriodEndsAt: billing.currentPeriodEndsAt,
          cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
        },
        cancellation: {
          effectiveDate,
          daysUntilEffective,
          canCancel: billing.subscriptionStatus === 'active' || billing.subscriptionStatus === 'trialing',
          dataRetentionDays: 30, // Days before data is deleted after cancellation
        },
        pendingCancellation: pendingCancellation
          ? {
              id: pendingCancellation.id,
              initiatedAt: pendingCancellation.initiated_at,
              retentionOffered: pendingCancellation.retention_offered,
              retentionOfferType: pendingCancellation.retention_offer_type,
              userResponse: pendingCancellation.user_response,
            }
          : null,
        retentionOffers,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing/subscription/cancellation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/billing/subscription/cancellation
 * Initiate cancellation with optional retention flow
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
    const validationResult = cancellationRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { reason, feedback } = validationResult.data;
    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Create cancellation request
    const cancellationId = await createCancellationRequest(supabase, {
      tenant_id: tenantId,
      initiated_by: userId,
      cancellation_reason: reason,
      feedback_survey: feedback ?? {},
    });

    if (!cancellationId) {
      return NextResponse.json({ error: 'Failed to create cancellation request' }, { status: 500 });
    }

    // Log the cancellation initiation
    await logBillingEvent(supabase, tenantId, 'cancellation_initiated', {
      cancellation_id: cancellationId,
      reason,
      feedback,
    });

    // Create audit log
    await createAuditLog(supabase, {
      tenant_id: tenantId,
      event_category: 'billing',
      event_type: 'subscription_cancellation',
      event_action: 'initiated',
      actor_type: 'user',
      actor_id: userId,
      target_type: 'subscription',
      target_id: billing.stripeSubscriptionId,
      change_summary: `Cancellation initiated: ${reason}`,
    });

    // Determine if we should offer retention based on reason and tier
    const shouldOfferRetention = determineIfShouldOfferRetention(billing, reason);
    const retentionOffers = getRetentionOffers(billing);

    if (shouldOfferRetention && retentionOffers.length > 0) {
      // Return the cancellation ID with retention offers
      return NextResponse.json({
        data: {
          cancellationId,
          status: 'retention_offered',
          message: 'Before you go, we have some offers that might help',
          retentionOffers,
        },
      });
    }

    // If no retention offer, proceed with immediate cancellation
    await proceedWithCancellation(supabase, tenantId, billing.stripeSubscriptionId, cancellationId);

    return NextResponse.json({
      data: {
        cancellationId,
        status: 'cancelled',
        message: 'Your subscription has been cancelled',
        effectiveDate: billing.currentPeriodEndsAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error in POST /api/billing/subscription/cancellation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/billing/subscription/cancellation
 * Respond to retention offer
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }
    
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    const body = await request.json();
    const validationResult = retentionResponseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { retentionId, accepted, offerType } = validationResult.data;
    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 });
    }

    if (accepted) {
      // Handle retention offer acceptance
      await respondToRetention(supabase, retentionId, true, 'retained');

      // Apply the appropriate retention action
      switch (offerType) {
        case 'discount': {
          // Apply discount coupon to subscription using discounts array
          if (billing.stripeSubscriptionId) {
            await stripe.subscriptions.update(billing.stripeSubscriptionId, {
              discounts: [{ coupon: 'retention_discount' }], // This would be a real coupon ID
            });
          }
          break;
        }
        case 'extended_trial': {
          // Extend trial period
          await extendTrial(supabase, tenantId, 14);
          break;
        }
        case 'pause': {
          // Pause subscription instead of canceling
          if (billing.stripeSubscriptionId) {
            // Stripe doesn't have a native pause, so we set a metadata flag
            // and handle this in our application logic
            await stripe.subscriptions.update(billing.stripeSubscriptionId, {
              metadata: { paused: 'true', pause_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
            });
          }
          break;
        }
        case 'downgrade': {
          // Downgrade to free tier instead of canceling
          if (billing.stripeSubscriptionId) {
            const freeTierPriceId = process.env.STRIPE_PRICE_FREE || 'price_free_test';
            const subscription = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
            
            if (subscription.items.data.length > 0) {
              await stripe.subscriptions.update(billing.stripeSubscriptionId, {
                items: [{ id: subscription.items.data[0].id, price: freeTierPriceId }],
                proration_behavior: 'none',
              });
            }
          }
          
          await updateTenantBilling(supabase, tenantId, {
            current_tier: 'free',
            subscription_status: 'active',
          });
          break;
        }
      }

      // Log retention success
      await logBillingEvent(supabase, tenantId, 'retention_offer_accepted', {
        retention_id: retentionId,
        offer_type: offerType,
      });

      // Create audit log
      await createAuditLog(supabase, {
        tenant_id: tenantId,
        event_category: 'billing',
        event_type: 'retention_accepted',
        event_action: offerType,
        actor_type: 'user',
        actor_id: userId,
        target_type: 'subscription',
        target_id: billing.stripeSubscriptionId ?? 'unknown',
        change_summary: `Retention offer accepted: ${offerType}`,
      });

      return NextResponse.json({
        data: {
          status: 'retained',
          message: 'We\'re glad you\'re staying! Your offer has been applied.',
          offerType,
        },
      });
    } else {
      // User declined retention offer, proceed with cancellation
      await respondToRetention(supabase, retentionId, false, 'cancelled');

      if (billing.stripeSubscriptionId) {
        await proceedWithCancellation(supabase, tenantId, billing.stripeSubscriptionId, retentionId);
      }

      return NextResponse.json({
        data: {
          status: 'cancelled',
          message: 'Your subscription has been cancelled',
          effectiveDate: billing.currentPeriodEndsAt,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error('Error in PATCH /api/billing/subscription/cancellation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface RetentionOffer {
  type: 'discount' | 'extended_trial' | 'pause' | 'downgrade';
  title: string;
  description: string;
  details: {
    discountPercent?: number;
    monthsDuration?: number;
    pauseDays?: number;
    downgradeTo?: string;
  };
}

function getRetentionOffers(billing: Awaited<ReturnType<typeof getTenantBilling>>): RetentionOffer[] {
  if (!billing) return [];

  const offers: RetentionOffer[] = [];

  // Don't offer retention for free tier
  if (billing.currentTier === 'free') {
    return offers;
  }

  // Offer discount for paid tiers
  if (billing.currentTier !== 'enterprise') {
    offers.push({
      type: 'discount',
      title: '30% Off Your Next 3 Months',
      description: 'Stay with us and save 30% on your subscription for the next 3 months',
      details: {
        discountPercent: 30,
        monthsDuration: 3,
      },
    });
  }

  // Offer trial extension for trialing users
  if (billing.subscriptionStatus === 'trialing') {
    offers.push({
      type: 'extended_trial',
      title: 'Extend Your Trial',
      description: 'Get an additional 14 days to explore all features',
      details: {
        pauseDays: 14,
      },
    });
  }

  // Offer pause for active subscriptions
  if (billing.subscriptionStatus === 'active') {
    offers.push({
      type: 'pause',
      title: 'Pause Your Subscription',
      description: 'Take a break for 30 days. You won\'t be charged and can resume anytime.',
      details: {
        pauseDays: 30,
      },
    });
  }

  // Offer downgrade as last resort
  offers.push({
    type: 'downgrade',
    title: 'Switch to Free Plan',
    description: 'Downgrade to our free plan and keep access to basic features',
    details: {
      downgradeTo: 'free',
    },
  });

  return offers;
}

function determineIfShouldOfferRetention(
  billing: Awaited<ReturnType<typeof getTenantBilling>>,
  reason: string
): boolean {
  if (!billing) return false;

  // Always offer retention for paid tiers
  if (billing.currentTier === 'free') {
    return false;
  }

  // Don't offer retention if already cancelled
  if (billing.subscriptionStatus === 'canceled') {
    return false;
  }

  // Offer retention for common reasons
  const retentionWorthyReasons = [
    'too_expensive',
    'not_using',
    'missing_features',
    'other',
  ];

  return retentionWorthyReasons.some((r) => reason.toLowerCase().includes(r));
}

async function proceedWithCancellation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  subscriptionId: string,
  cancellationId: string
): Promise<void> {
  // Cancel at period end in Stripe
  await stripe?.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  // Update tenant billing
  await updateTenantBilling(supabase, tenantId, {
    cancel_at_period_end: true,
  });

  // Update cancellation record
  await supabase
    .from('cancellation_retention')
    .update({
      final_status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', cancellationId);

  // Log billing event
  await logBillingEvent(supabase, tenantId, 'cancellation_completed', {
    cancellation_id: cancellationId,
    subscription_id: subscriptionId,
  });
}

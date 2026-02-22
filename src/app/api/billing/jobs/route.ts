import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { handleTrialExpirations } from '@/lib/billing/service';
import { createWebhookProcessor } from '@/lib/billing/webhook-processor';

/**
 * POST /api/billing/jobs
 * Execute scheduled billing jobs
 * 
 * This endpoint is designed to be called by a cron job scheduler
 * (e.g., Vercel Cron, AWS EventBridge, or similar)
 * 
 * Required headers:
 * - Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { job } = body;

    if (!job) {
      return NextResponse.json({ error: 'Job name is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const results: Record<string, unknown> = {};

    switch (job) {
      case 'trial-expiration': {
        // Handle trial expirations
        const expiredCount = await handleTrialExpirations(supabase);
        results.trialExpirations = {
          processed: expiredCount,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'webhook-retry': {
        // Process pending webhook retries
        const { idempotencyService, processor } = createWebhookProcessor(supabase);
        const pendingEvents = await idempotencyService.getPendingRetries(100);
        let successCount = 0;
        let failureCount = 0;

        for (const event of pendingEvents) {
          try {
            const result = await processor.retryEvent(event);
            if (result.success) {
              successCount++;
            } else {
              failureCount++;
            }
          } catch (error) {
            failureCount++;
            console.error(`Error retrying webhook event ${event.id}:`, error);
          }
        }

        results.webhookRetries = {
          processed: pendingEvents.length,
          succeeded: successCount,
          failed: failureCount,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'usage-reconciliation': {
        // Run automated usage reconciliation for the previous period
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, current_period_starts_at, current_period_ends_at');

        let reconciledCount = 0;

        for (const tenant of tenants || []) {
          try {
            // Check if reconciliation is needed
            const { data: existingRecon } = await supabase
              .from('usage_reconciliation_log')
              .select('id')
              .eq('tenant_id', tenant.id)
              .eq('period_start', tenant.current_period_starts_at)
              .eq('period_end', tenant.current_period_ends_at)
              .maybeSingle();

            if (!existingRecon) {
              await supabase.rpc('reconcile_usage', {
                p_tenant_id: tenant.id,
                p_period_start: tenant.current_period_starts_at,
                p_period_end: tenant.current_period_ends_at,
                p_initiated_by: null, // System-initiated
              });
              reconciledCount++;
            }
          } catch (error) {
            console.error(`Error reconciling usage for tenant ${tenant.id}:`, error);
          }
        }

        results.usageReconciliation = {
          tenantsProcessed: reconciledCount,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'payment-method-expiration': {
        // Update payment method statuses based on expiration
        const { error } = await supabase.rpc('update_payment_method_expiration');

        if (error) {
          console.error('Error updating payment method expiration:', error);
          results.paymentMethodExpiration = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        } else {
          results.paymentMethodExpiration = {
            success: true,
            timestamp: new Date().toISOString(),
          };
        }
        break;
      }

      case 'failed-payment-retry': {
        // Retry failed payments that are due
        const { data: failedPayments } = await supabase
          .from('failed_payments')
          .select('*')
          .in('status', ['pending', 'retrying'])
          .lte('next_retry_at', new Date().toISOString())
          .limit(50);

        let retryCount = 0;
        let successCount = 0;

        for (const payment of failedPayments || []) {
          try {
            // Get tenant's default payment method
            const { data: tenant } = await supabase
              .from('tenants')
              .select('stripe_customer_id, stripe_subscription_id')
              .eq('id', payment.tenant_id)
              .single();

            if (tenant?.stripe_customer_id) {
              // Retry the payment
              // This would typically use Stripe's payment intent retry mechanism
              // For now, just log the attempt
              await supabase.from('billing_events').insert({
                tenant_id: payment.tenant_id,
                event_type: 'payment_retry_attempted',
                data: {
                  failed_payment_id: payment.id,
                  stripe_invoice_id: payment.stripe_invoice_id,
                  attempt_number: payment.attempt_number + 1,
                },
              });

              retryCount++;

              // Update attempt count
              await supabase
                .from('failed_payments')
                .update({
                  attempt_number: payment.attempt_number + 1,
                  next_retry_at: calculateNextRetry(payment.attempt_number + 1),
                })
                .eq('id', payment.id);
            }
          } catch (error) {
            console.error(`Error retrying failed payment ${payment.id}:`, error);
          }
        }

        results.failedPaymentRetry = {
          attempted: retryCount,
          succeeded: successCount,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'data-cleanup': {
        // Clean up old data based on retention policies
        const { idempotencyService } = createWebhookProcessor(supabase);

        // Cleanup old webhook events
        const webhookCleanupCount = await idempotencyService.cleanupOldEvents(90);

        // Cleanup old audit logs
        const { data: auditCleanupCount } = await supabase.rpc('cleanup_old_audit_logs');

        results.dataCleanup = {
          webhookEventsRemoved: webhookCleanupCount,
          auditLogsRemoved: auditCleanupCount || 0,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'daily-summary': {
        // Generate daily summary reports
        const today = new Date().toISOString().split('T')[0];

        // Get summary stats
        const { data: dailyStats } = await supabase.rpc('get_daily_billing_stats', {
          p_date: today,
        });

        results.dailySummary = {
          date: today,
          stats: dailyStats || {},
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'all': {
        // Run all jobs
        const jobs = [
          'trial-expiration',
          'webhook-retry',
          'usage-reconciliation',
          'payment-method-expiration',
          'failed-payment-retry',
          'data-cleanup',
        ];

        for (const jobName of jobs) {
          try {
            const jobResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/jobs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader || '',
              },
              body: JSON.stringify({ job: jobName }),
            });

            const jobResult = await jobResponse.json();
            results[jobName] = jobResult.data || jobResult;
          } catch (error) {
            results[jobName] = {
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown job: ${job}`, availableJobs: getAvailableJobs() },
          { status: 400 }
        );
    }

    return NextResponse.json({
      data: {
        job,
        executedAt: new Date().toISOString(),
        results,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/billing/jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/jobs
 * Get available jobs and their status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get job queue status
    const [
      { count: pendingWebhooks },
      { count: pendingRetries },
      { count: activeTrials },
      { count: expiringTrials },
      { count: failedPayments },
    ] = await Promise.all([
      supabase.from('webhook_events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('webhook_events').select('*', { count: 'exact', head: true }).eq('status', 'retrying'),
      supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'trialing'),
      supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'trialing')
        .lt('trial_ends_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('failed_payments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'retrying']),
    ]);

    return NextResponse.json({
      data: {
        availableJobs: getAvailableJobs(),
        queueStatus: {
          pendingWebhooks: pendingWebhooks || 0,
          retryingWebhooks: pendingRetries || 0,
          activeTrials: activeTrials || 0,
          expiringTrials: expiringTrials || 0,
          failedPayments: failedPayments || 0,
        },
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing/jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAvailableJobs(): Array<{ name: string; description: string; schedule: string }> {
  return [
    {
      name: 'trial-expiration',
      description: 'Process expired trials and downgrade to free tier',
      schedule: 'Every hour',
    },
    {
      name: 'webhook-retry',
      description: 'Retry failed webhook events',
      schedule: 'Every 5 minutes',
    },
    {
      name: 'usage-reconciliation',
      description: 'Reconcile usage data with billing records',
      schedule: 'Daily at 00:00',
    },
    {
      name: 'payment-method-expiration',
      description: 'Update payment method statuses based on expiration dates',
      schedule: 'Daily at 01:00',
    },
    {
      name: 'failed-payment-retry',
      description: 'Retry failed payments that are scheduled for retry',
      schedule: 'Every 4 hours',
    },
    {
      name: 'data-cleanup',
      description: 'Clean up old data based on retention policies',
      schedule: 'Weekly on Sunday',
    },
    {
      name: 'daily-summary',
      description: 'Generate daily billing summary reports',
      schedule: 'Daily at 02:00',
    },
    {
      name: 'all',
      description: 'Run all scheduled jobs',
      schedule: 'On demand',
    },
  ];
}

function calculateNextRetry(attemptNumber: number): string {
  const delays = [
    1000 * 60 * 60, // 1 hour
    1000 * 60 * 60 * 4, // 4 hours
    1000 * 60 * 60 * 24, // 24 hours
    1000 * 60 * 60 * 48, // 48 hours
  ];

  const delay = delays[Math.min(attemptNumber - 1, delays.length - 1)] || delays[delays.length - 1];
  const nextRetry = new Date(Date.now() + delay);
  return nextRetry.toISOString();
}

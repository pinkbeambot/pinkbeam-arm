import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import {
  getUsageWithLimits,
  getUsageSummary,
  recordUsage,
  reconcileUsage,
  createAuditLog,
} from '@/lib/billing/service';
import { usageQuerySchema, recordUsageSchema } from '@/lib/validation/billing';
import { z } from 'zod';

/**
 * GET /api/billing/usage
 * Get usage data with limits and trends
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    // Get tenant billing to determine tier
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('current_tier, current_period_starts_at, current_period_ends_at')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      metricType: searchParams.get('metricType') || undefined,
    };

    const { startDate, endDate, metricType } = usageQuerySchema.parse(query);

    // Get usage with limits
    const usage = await getUsageWithLimits(supabase, tenantId, tenant.current_tier);

    // Determine date range for summary
    const periodStart = startDate || tenant.current_period_starts_at;
    const periodEnd = endDate || tenant.current_period_ends_at || new Date().toISOString();

    // Get usage summary
    const summary = await getUsageSummary(supabase, tenantId, periodStart, periodEnd);

    // Filter by metric type if specified
    const filteredSummary = metricType
      ? summary.filter((s) => s.metric_type === metricType)
      : summary;

    // Get daily trends
    const { data: dailyTrends } = await supabase.rpc('get_tenant_daily_costs', {
      p_tenant_id: tenantId,
      p_days: 30,
    });

    // Get active usage alerts
    const { data: alerts } = await supabase
      .from('usage_alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_triggered', true)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      data: {
        currentPeriod: {
          start: periodStart,
          end: periodEnd,
        },
        usage,
        summary: filteredSummary,
        trends: {
          daily: dailyTrends || [],
        },
        alerts: alerts || [],
        costs: {
          subscriptionCents: 0, // Would be populated from actual subscription
          usageCents: filteredSummary.reduce((sum, s) => sum + (s.total_cost_cents || 0), 0),
          totalCents: filteredSummary.reduce((sum, s) => sum + (s.total_cost_cents || 0), 0),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in GET /api/billing/usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/billing/usage
 * Record usage (typically called by internal systems)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    const body = await request.json();
    const validationResult = recordUsageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { metricType, metricName, usageCount, usageCostCents, periodStart, periodEnd, metadata } =
      validationResult.data;

    // Record the usage
    const usageId = await recordUsage(supabase, {
      tenant_id: tenantId,
      metric_type: metricType,
      metric_name: metricName,
      usage_count: usageCount,
      usage_cost_cents: usageCostCents,
      period_start: periodStart || new Date().toISOString(),
      period_end: periodEnd || new Date().toISOString(),
      metadata: metadata || {},
    });

    if (!usageId) {
      return NextResponse.json(
        { error: 'Failed to record usage' },
        { status: 500 }
      );
    }

    // Create audit log
    await createAuditLog(supabase, {
      tenant_id: tenantId,
      event_category: 'billing',
      event_type: 'usage_recorded',
      event_action: 'record',
      actor_type: 'user',
      actor_id: userId,
      target_type: 'usage',
      target_id: usageId,
      change_summary: `Recorded ${metricType}.${metricName}: ${usageCount}`,
    });

    return NextResponse.json({
      data: {
        usageId,
        metricType,
        metricName,
        usageCount,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/billing/usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/billing/usage/reconcile
 * Trigger usage reconciliation
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    const body = await request.json();
    const { periodStart, periodEnd, reconciliationType = 'manual' } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: periodStart, periodEnd' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'periodStart must be before periodEnd' },
        { status: 400 }
      );
    }

    // Check if reconciliation already exists for this period
    const { data: existingReconciliation } = await supabase
      .from('usage_reconciliation_log')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .eq('is_reconciled', true)
      .maybeSingle();

    if (existingReconciliation) {
      return NextResponse.json({
        data: {
          reconciliationId: existingReconciliation.id,
          status: 'already_reconciled',
          message: 'This period has already been reconciled',
        },
      });
    }

    // Trigger reconciliation
    const reconciliationId = await reconcileUsage(
      supabase,
      tenantId,
      periodStart,
      periodEnd,
      userId
    );

    if (!reconciliationId) {
      return NextResponse.json(
        { error: 'Failed to start reconciliation' },
        { status: 500 }
      );
    }

    // Get the reconciliation details
    const { data: reconciliation } = await supabase
      .from('usage_reconciliation_log')
      .select('*')
      .eq('id', reconciliationId)
      .single();

    // Create audit log
    await createAuditLog(supabase, {
      tenant_id: tenantId,
      event_category: 'billing',
      event_type: 'usage_reconciliation',
      event_action: reconciliationType,
      actor_type: 'user',
      actor_id: userId,
      target_type: 'usage_period',
      target_id: reconciliationId,
      change_summary: `Usage reconciliation for ${periodStart} to ${periodEnd}`,
    });

    return NextResponse.json({
      data: {
        reconciliationId,
        status: reconciliation?.is_reconciled ? 'reconciled' : 'pending',
        period: {
          start: periodStart,
          end: periodEnd,
        },
        results: reconciliation
          ? {
              calculatedUsage: reconciliation.calculated_usage,
              actualUsage: reconciliation.actual_usage,
              variance: reconciliation.variance,
              variancePercent: reconciliation.variance_percent,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error in PUT /api/billing/usage/reconcile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

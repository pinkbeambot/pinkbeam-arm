import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import {
  getTenantBilling,
  getUsageWithLimits,
  getAllSubscriptionTiers,
  getRecentInvoices,
} from '@/lib/billing/service';

/**
 * GET /api/billing
 * Returns billing info, usage, plans, and invoices for the authenticated tenant.
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

    const [usage, plans, invoices] = await Promise.all([
      getUsageWithLimits(supabase, tenantId, billing.currentTier),
      getAllSubscriptionTiers(supabase),
      getRecentInvoices(supabase, tenantId),
    ]);

    return NextResponse.json({
      data: {
        billing,
        usage,
        plans,
        invoices,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { getRecentInvoices } from '@/lib/billing/service';
import { listInvoicesQuerySchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * GET /api/billing/invoices
 * Returns invoice history for the authenticated tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status') || undefined,
    };

    const { limit, status } = listInvoicesQuerySchema.parse(query);

    const invoices = await getRecentInvoices(supabase, tenantId, limit, status);

    return NextResponse.json({
      data: {
        invoices,
        count: invoices.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in GET /api/billing/invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

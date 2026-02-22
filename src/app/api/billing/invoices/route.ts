import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { stripe } from '@/lib/billing/stripe';
import {
  getRecentInvoices,
  createInvoiceDispute,
  getTaxRecords,
  createAuditLog,
} from '@/lib/billing/service';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { listInvoicesQuerySchema, generateInvoicePdfSchema } from '@/lib/validation/billing';
import { z } from 'zod';

/**
 * GET /api/billing/invoices
 * Get invoice history with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status') || undefined,
      includeLineItems: searchParams.get('includeLineItems') === 'true',
      includeTax: searchParams.get('includeTax') === 'true',
    };

    const { limit, status } = listInvoicesQuerySchema.parse(query);

    const invoices = await getRecentInvoices(supabase, tenantId, limit, status);

    // If requested, enrich with line items and tax records
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const enriched: Record<string, unknown> = { ...invoice };

        if (query.includeLineItems) {
          const { data: lineItems } = await supabase
            .from('invoice_line_items')
            .select('*')
            .eq('invoice_id', invoice.id)
            .order('created_at', { ascending: true });
          enriched.lineItems = lineItems || [];
        }

        if (query.includeTax) {
          const taxRecords = await getTaxRecords(supabase, tenantId);
          enriched.taxRecords = taxRecords.filter(
            (tax) => tax.invoice_id === invoice.id
          );
        }

        return enriched;
      })
    );

    return NextResponse.json({
      data: {
        invoices: enrichedInvoices,
        count: enrichedInvoices.length,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/billing/invoices/:id/pdf
 * Generate or retrieve PDF for an invoice
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    const body = await request.json();
    const validationResult = generateInvoicePdfSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { invoiceId } = validationResult.data;

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if PDF already exists
    const { data: existingPdf } = await supabase
      .from('generated_invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle();

    if (existingPdf?.pdf_url) {
      // Update download count
      await supabase
        .from('generated_invoices')
        .update({
          download_count: (existingPdf.download_count || 0) + 1,
          last_downloaded_at: new Date().toISOString(),
        })
        .eq('id', existingPdf.id);

      return NextResponse.json({
        data: {
          invoiceId,
          pdfUrl: existingPdf.pdf_url,
          generatedAt: existingPdf.generated_at,
          downloadCount: (existingPdf.download_count || 0) + 1,
        },
      });
    }

    // Generate new PDF
    const pdfResult = await generateInvoicePdf(supabase, invoice, tenantId, userId);

    if (!pdfResult.success) {
      return NextResponse.json(
        { error: 'Failed to generate PDF', details: pdfResult.error },
        { status: 500 }
      );
    }

    // Create audit log
    await createAuditLog(supabase, {
      tenant_id: tenantId,
      event_category: 'billing',
      event_type: 'invoice_pdf_generated',
      event_action: 'generate',
      actor_type: 'user',
      actor_id: userId,
      target_type: 'invoice',
      target_id: invoiceId,
      change_summary: `PDF generated for invoice ${invoice.stripe_invoice_id}`,
    });

    return NextResponse.json({
      data: {
        invoiceId,
        pdfUrl: pdfResult.pdfUrl,
        generatedAt: new Date().toISOString(),
        downloadCount: 1,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/billing/invoices/pdf:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/billing/invoices/:id/dispute
 * Create an invoice dispute
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userId } = auth;

    const body = await request.json();
    const { invoiceId, disputeType, description, requestedAmountCents, requestedAction } = body;

    // Validate required fields
    if (!invoiceId || !disputeType || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, disputeType, description' },
        { status: 400 }
      );
    }

    // Verify invoice belongs to tenant
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if dispute already exists for this invoice
    const { data: existingDispute } = await supabase
      .from('invoice_disputes')
      .select('id, status')
      .eq('invoice_id', invoiceId)
      .in('status', ['open', 'under_review'])
      .maybeSingle();

    if (existingDispute) {
      return NextResponse.json(
        { error: 'A dispute already exists for this invoice', disputeId: existingDispute.id },
        { status: 409 }
      );
    }

    // Create dispute
    const disputeId = await createInvoiceDispute(supabase, {
      tenant_id: tenantId,
      invoice_id: invoiceId,
      dispute_type: disputeType,
      description,
      requested_amount_cents: requestedAmountCents,
      requested_action: requestedAction,
      priority: calculateDisputePriority(disputeType, requestedAmountCents),
    });

    if (!disputeId) {
      return NextResponse.json(
        { error: 'Failed to create dispute' },
        { status: 500 }
      );
    }

    // Create audit log
    await createAuditLog(supabase, {
      tenant_id: tenantId,
      event_category: 'billing',
      event_type: 'invoice_dispute_created',
      event_action: 'create',
      actor_type: 'user',
      actor_id: userId,
      target_type: 'invoice',
      target_id: invoiceId,
      change_summary: `Dispute created: ${disputeType}`,
    });

    return NextResponse.json({
      data: {
        disputeId,
        status: 'open',
        message: 'Your dispute has been submitted and will be reviewed within 2 business days',
      },
    });
  } catch (error) {
    console.error('Error in PUT /api/billing/invoices/dispute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface PdfGenerationResult {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

async function generateInvoicePdf(
  supabase: ReturnType<typeof createServiceRoleClient>,
  invoice: Record<string, unknown>,
  tenantId: string,
  userId: string
): Promise<PdfGenerationResult> {
  try {
    // For now, use Stripe's hosted invoice URL if available
    // In production, you would generate a custom PDF using a library like puppeteer,
    // react-pdf, or a service like DocRaptor or PDFShift

    const hostedUrl = invoice.hosted_invoice_url as string;
    const stripePdfUrl = invoice.invoice_pdf_url as string;

    // If Stripe provides a PDF URL, use it
    if (stripePdfUrl) {
      // Store the reference
      const { data, error } = await supabase
        .from('generated_invoices')
        .insert({
          tenant_id: tenantId,
          invoice_id: invoice.id,
          pdf_url: stripePdfUrl,
          generated_at: new Date().toISOString(),
          generated_by: userId,
          download_count: 1,
          last_downloaded_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to store PDF reference:', error);
      }

      return {
        success: true,
        pdfUrl: stripePdfUrl,
      };
    }

    // If no Stripe PDF, generate a custom one (placeholder for actual implementation)
    // This would typically use a PDF generation service or library
    const customPdfUrl = await generateCustomInvoicePdf(invoice, tenantId);

    if (customPdfUrl) {
      await supabase.from('generated_invoices').insert({
        tenant_id: tenantId,
        invoice_id: invoice.id,
        pdf_url: customPdfUrl,
        generated_at: new Date().toISOString(),
        generated_by: userId,
        download_count: 1,
        last_downloaded_at: new Date().toISOString(),
      });

      return {
        success: true,
        pdfUrl: customPdfUrl,
      };
    }

    return {
      success: false,
      error: 'No PDF available for this invoice',
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function generateCustomInvoicePdf(
  invoice: Record<string, unknown>,
  tenantId: string
): Promise<string | null> {
  // Placeholder for actual PDF generation
  // In production, this would:
  // 1. Use a PDF generation library (react-pdf, puppeteer)
  // 2. Or call an external service (DocRaptor, PDFShift, etc.)
  // 3. Upload to Supabase Storage
  // 4. Return the public URL

  // For now, return the hosted invoice URL if available
  return (invoice.hosted_invoice_url as string) || null;
}

function calculateDisputePriority(
  disputeType: string,
  requestedAmountCents?: number
): string {
  // High priority for fraud and large amounts
  if (disputeType === 'fraud') {
    return 'urgent';
  }

  if (disputeType === 'billing_error' && requestedAmountCents && requestedAmountCents > 100000) {
    return 'high';
  }

  // Normal priority for most disputes
  if (disputeType === 'billing_error' || disputeType === 'service_issue') {
    return 'normal';
  }

  // Low priority for duplicates and minor issues
  return 'low';
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { stripe } from '@/lib/billing/stripe';
import { createTaxRecord, createAuditLog, getTenantBilling } from '@/lib/billing/service';
import { z } from 'zod';

/**
 * POST /api/billing/tax/calculate
 * Calculate tax for a given amount and jurisdiction
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

    // Validation schema for tax calculation
    const taxCalculationSchema = z.object({
      amountCents: z.number().int().positive(),
      currency: z.string().default('usd'),
      countryCode: z.string().length(2),
      regionCode: z.string().optional(),
      taxNumber: z.string().optional(),
      saveToInvoiceId: z.string().uuid().optional(),
    });

    const validationResult = taxCalculationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { amountCents, currency, countryCode, regionCode, taxNumber, saveToInvoiceId } =
      validationResult.data;

    // Get tenant billing info
    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
    }

    // Calculate tax using Stripe Tax (if available) or manual calculation
    // For now, implement basic VAT/GST rules
    const taxResult = await calculateTax(
      amountCents,
      countryCode,
      regionCode,
      taxNumber
    );

    // Save tax record if associated with an invoice
    let taxRecordId: string | null = null;
    if (saveToInvoiceId) {
      taxRecordId = await createTaxRecord(supabase, {
        tenant_id: tenantId,
        invoice_id: saveToInvoiceId,
        tax_type: taxResult.taxType,
        tax_rate: taxResult.taxRate,
        tax_amount_cents: taxResult.taxAmountCents,
        country_code: countryCode,
        region_code: regionCode,
        tax_number: taxNumber,
        evidence_data: {
          calculated_at: new Date().toISOString(),
          calculation_method: 'vat_gst_table',
        },
      });

      // Create audit log
      await createAuditLog(supabase, {
        tenant_id: tenantId,
        event_category: 'billing',
        event_type: 'tax_calculated',
        event_action: 'calculate',
        actor_type: 'user',
        actor_id: userId,
        target_type: 'invoice',
        target_id: saveToInvoiceId,
        change_summary: `Tax calculated: ${taxResult.taxType} @ ${(taxResult.taxRate * 100).toFixed(2)}%`,
      });
    }

    return NextResponse.json({
      data: {
        amountCents,
        taxAmountCents: taxResult.taxAmountCents,
        totalAmountCents: amountCents + taxResult.taxAmountCents,
        taxRate: taxResult.taxRate,
        taxType: taxResult.taxType,
        taxInclusive: taxResult.taxInclusive,
        countryCode,
        regionCode,
        taxRecordId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/billing/tax/calculate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/billing/tax/rates
 * Get tax rates for different jurisdictions
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Get tenant's country from billing details
    const { data: tenant } = await supabase
      .from('tenants')
      .select('billing_country, billing_region')
      .eq('id', tenantId)
      .single();

    const countryCode = tenant?.billing_country || 'US';
    const regionCode = tenant?.billing_region;

    // Get applicable tax rate
    const taxRate = getTaxRate(countryCode, regionCode);

    return NextResponse.json({
      data: {
        jurisdiction: {
          country: countryCode,
          region: regionCode,
        },
        taxRate: taxRate.rate,
        taxType: taxRate.type,
        requirements: getInvoiceRequirements(countryCode),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing/tax/rates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// Tax Calculation Logic
// ============================================================================

interface TaxCalculation {
  taxAmountCents: number;
  taxRate: number;
  taxType: 'vat' | 'gst' | 'sales_tax' | 'vat_moss' | 'none';
  taxInclusive: boolean;
}

async function calculateTax(
  amountCents: number,
  countryCode: string,
  regionCode?: string,
  taxNumber?: string
): Promise<TaxCalculation> {
  // VAT rates for EU countries
  const vatRates: Record<string, number> = {
    AT: 0.2, // Austria
    BE: 0.21, // Belgium
    BG: 0.2, // Bulgaria
    HR: 0.25, // Croatia
    CY: 0.19, // Cyprus
    CZ: 0.21, // Czech Republic
    DK: 0.25, // Denmark
    EE: 0.2, // Estonia
    FI: 0.24, // Finland
    FR: 0.2, // France
    DE: 0.19, // Germany
    GR: 0.24, // Greece
    HU: 0.27, // Hungary
    IE: 0.23, // Ireland
    IT: 0.22, // Italy
    LV: 0.21, // Latvia
    LT: 0.21, // Lithuania
    LU: 0.17, // Luxembourg
    MT: 0.18, // Malta
    NL: 0.21, // Netherlands
    PL: 0.23, // Poland
    PT: 0.23, // Portugal
    RO: 0.19, // Romania
    SK: 0.2, // Slovakia
    SI: 0.22, // Slovenia
    ES: 0.21, // Spain
    SE: 0.25, // Sweden
    GB: 0.2, // UK (post-Brexit)
  };

  // GST rates
  const gstRates: Record<string, number> = {
    AU: 0.1, // Australia
    NZ: 0.15, // New Zealand
    SG: 0.08, // Singapore
    CA: 0.05, // Canada (federal GST)
    IN: 0.18, // India
  };

  // US Sales Tax (simplified - would need full taxjar/stripe tax integration)
  const usSalesTaxRates: Record<string, number> = {
    CA: 0.0725, // California
    NY: 0.08, // New York
    TX: 0.0625, // Texas
    FL: 0.06, // Florida
    // ... more states
  };

  // Check for reverse charge (B2B with VAT number)
  const isEU = Object.keys(vatRates).includes(countryCode);
  if (isEU && taxNumber) {
    // Validate VAT number format (simplified)
    const vatPattern = new RegExp(`^${countryCode}[0-9A-Z]{8,12}$`, 'i');
    if (vatPattern.test(taxNumber)) {
      return {
        taxAmountCents: 0,
        taxRate: 0,
        taxType: 'vat_moss',
        taxInclusive: false,
      };
    }
  }

  // Calculate tax based on jurisdiction
  if (vatRates[countryCode]) {
    const rate = vatRates[countryCode];
    return {
      taxAmountCents: Math.round(amountCents * rate),
      taxRate: rate,
      taxType: 'vat',
      taxInclusive: false,
    };
  }

  if (gstRates[countryCode]) {
    const rate = gstRates[countryCode];
    return {
      taxAmountCents: Math.round(amountCents * rate),
      taxRate: rate,
      taxType: 'gst',
      taxInclusive: false,
    };
  }

  if (countryCode === 'US' && regionCode && usSalesTaxRates[regionCode]) {
    const rate = usSalesTaxRates[regionCode];
    return {
      taxAmountCents: Math.round(amountCents * rate),
      taxRate: rate,
      taxType: 'sales_tax',
      taxInclusive: false,
    };
  }

  // No tax for other jurisdictions
  return {
    taxAmountCents: 0,
    taxRate: 0,
    taxType: 'none',
    taxInclusive: false,
  };
}

function getTaxRate(countryCode: string, regionCode?: string): { rate: number; type: string } {
  const calculation = calculateTax(10000, countryCode, regionCode);
  return {
    rate: calculation.taxRate,
    type: calculation.taxType,
  };
}

interface InvoiceRequirements {
  requiresTaxNumber: boolean;
  requiresTaxBreakdown: boolean;
  requiresCompanyInfo: boolean;
  requiredFields: string[];
}

function getInvoiceRequirements(countryCode: string): InvoiceRequirements {
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
    'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ];

  if (euCountries.includes(countryCode)) {
    return {
      requiresTaxNumber: true,
      requiresTaxBreakdown: true,
      requiresCompanyInfo: true,
      requiredFields: [
        'vat_number',
        'seller_vat_number',
        'tax_rate',
        'tax_amount',
        'invoice_date',
        'due_date',
      ],
    };
  }

  if (countryCode === 'US') {
    return {
      requiresTaxNumber: false,
      requiresTaxBreakdown: true,
      requiresCompanyInfo: true,
      requiredFields: ['sales_tax_amount', 'jurisdiction'],
    };
  }

  // Default requirements
  return {
    requiresTaxNumber: false,
    requiresTaxBreakdown: false,
    requiresCompanyInfo: false,
    requiredFields: ['invoice_date', 'due_date', 'amount'],
  };
}

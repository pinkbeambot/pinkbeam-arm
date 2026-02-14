import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getTenantId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !userProfile?.tenant_id) throw new Error('Tenant not found');
  return userProfile.tenant_id;
}

/**
 * @openapi
 * /leads/export:
 *   get:
 *     summary: Export leads as CSV
 *     description: Export all leads for the tenant as a CSV file
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *         description: Filter by stage before export
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const tenantId = await getTenantId(supabase);
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');

    let dbQuery = supabase
      .from('leads')
      .select(
        'id, first_name, last_name, email, phone, title, company_name, company_size, company_industry, company_website, score, stage, source, location, timezone, notes, is_hot, do_not_contact, outreach_count, response_count, email_opens, email_clicks, last_contacted_at, last_response_at, meeting_booked_at, created_at, updated_at'
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (stage) {
      dbQuery = dbQuery.eq('stage', stage);
    }

    const { data: leads, error } = await dbQuery;

    if (error) {
      console.error('Error exporting leads:', error);
      return NextResponse.json(
        { error: 'Failed to export leads', details: error.message },
        { status: 500 }
      );
    }

    // Generate CSV
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Title',
      'Company Name',
      'Company Size',
      'Company Industry',
      'Company Website',
      'Score',
      'Stage',
      'Source',
      'Location',
      'Timezone',
      'Notes',
      'Is Hot',
      'Do Not Contact',
      'Outreach Count',
      'Response Count',
      'Email Opens',
      'Email Clicks',
      'Last Contacted At',
      'Last Response At',
      'Meeting Booked At',
      'Created At',
      'Updated At',
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = leads?.map((lead) => [
      lead.id,
      lead.first_name,
      lead.last_name,
      lead.email,
      lead.phone,
      lead.title,
      lead.company_name,
      lead.company_size,
      lead.company_industry,
      lead.company_website,
      lead.score,
      lead.stage,
      lead.source,
      lead.location,
      lead.timezone,
      lead.notes,
      lead.is_hot,
      lead.do_not_contact,
      lead.outreach_count,
      lead.response_count,
      lead.email_opens,
      lead.email_clicks,
      lead.last_contacted_at,
      lead.last_response_at,
      lead.meeting_booked_at,
      lead.created_at,
      lead.updated_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...(rows?.map((row) => row.map(escapeCsv).join(',')) || []),
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    console.error('Unexpected error in GET /api/leads/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

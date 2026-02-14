import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createOutreachSchema, listOutreachQuerySchema } from '@/lib/validation';
import { z } from 'zod';

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
 * /leads/outreach:
 *   get:
 *     summary: List outreach activities
 *     description: List outreach activities with filtering support
 *     tags:
 *       - Outreach
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lead_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by lead ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, linkedin_message, linkedin_connection, cold_call, voicemail, sms, other]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, delivered, opened, clicked, replied, bounced, failed, unsubscribed]
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
    const queryParams = {
      lead_id: searchParams.get('lead_id') || undefined,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const validatedQuery = listOutreachQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    let dbQuery = supabase
      .from('outreach_activities')
      .select(
        `
        *,
        lead:lead_id(id, first_name, last_name, company_name, email),
        agent:agent_id(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (validatedQuery.lead_id) {
      dbQuery = dbQuery.eq('lead_id', validatedQuery.lead_id);
    }
    if (validatedQuery.type) {
      dbQuery = dbQuery.eq('type', validatedQuery.type);
    }
    if (validatedQuery.status) {
      dbQuery = dbQuery.eq('status', validatedQuery.status);
    }

    const { data: outreach, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching outreach:', error);
      return NextResponse.json(
        { error: 'Failed to fetch outreach activities', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: outreach,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    console.error('Unexpected error in GET /api/leads/outreach:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /leads/outreach:
 *   post:
 *     summary: Create outreach activity
 *     description: Create a new outreach activity (email, LinkedIn, call) for a lead
 *     tags:
 *       - Outreach
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOutreachInput'
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const body = await request.json();
    const validatedData = createOutreachSchema.parse(body);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const tenantId = await getTenantId(supabase);
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Get Mike's agent ID if exists
    const { data: mikeAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', 'mike')
      .single();

    const { data: outreach, error } = await supabase
      .from('outreach_activities')
      .insert({
        ...validatedData,
        tenant_id: tenantId,
        agent_id: mikeAgent?.id,
      })
      .select(
        `
        *,
        lead:lead_id(id, first_name, last_name, company_name, email),
        agent:agent_id(id, name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('Error creating outreach:', error);
      return NextResponse.json(
        { error: 'Failed to create outreach activity', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: outreach }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    console.error('Unexpected error in POST /api/leads/outreach:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

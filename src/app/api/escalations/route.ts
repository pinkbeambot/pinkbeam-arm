import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createEscalationSchema, listEscalationsQuerySchema } from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/escalations
 * List escalations with filtering support
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      urgency: searchParams.get('urgency') || undefined,
      type: searchParams.get('type') || undefined,
      agent_id: searchParams.get('agent_id') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listEscalationsQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('escalations')
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status),
        resolver:resolved_by(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (validatedQuery.status) {
      dbQuery = dbQuery.eq('status', validatedQuery.status);
    }
    if (validatedQuery.urgency) {
      dbQuery = dbQuery.eq('urgency', validatedQuery.urgency);
    }
    if (validatedQuery.type) {
      dbQuery = dbQuery.eq('type', validatedQuery.type);
    }
    if (validatedQuery.agent_id) {
      dbQuery = dbQuery.eq('agent_id', validatedQuery.agent_id);
    }
    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search;
      dbQuery = dbQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Execute query
    const { data: escalations, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching escalations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch escalations', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const formattedEscalations = escalations?.map((escalation) => ({
      ...escalation,
      agent: escalation.agent || undefined,
      task: escalation.task || undefined,
      resolver: escalation.resolver || undefined,
    }));

    return NextResponse.json({
      data: formattedEscalations,
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
    console.error('Unexpected error in GET /api/escalations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/escalations
 * Create a new escalation
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createEscalationSchema.parse(body);

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Validate agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', validatedData.agent_id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 400 }
      );
    }

    // Validate task exists and belongs to tenant (if provided)
    if (validatedData.task_id) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', validatedData.task_id)
        .eq('tenant_id', tenantId)
        .single();

      if (taskError || !task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 400 }
        );
      }
    }

    // Create the escalation
    const { data: escalation, error } = await supabase
      .from('escalations')
      .insert({
        tenant_id: tenantId,
        agent_id: validatedData.agent_id,
        task_id: validatedData.task_id,
        type: validatedData.type,
        urgency: validatedData.urgency,
        title: validatedData.title,
        description: validatedData.description,
        situation_context: validatedData.situation_context || {},
        question: validatedData.question || {},
        agent_analysis: validatedData.agent_analysis || {},
        status: 'open',
      })
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status)
      `
      )
      .single();

    if (error) {
      console.error('Error creating escalation:', error);
      return NextResponse.json(
        { error: 'Failed to create escalation', details: error.message },
        { status: 500 }
      );
    }

    // Activity logging is handled by database trigger

    return NextResponse.json({ data: escalation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/escalations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

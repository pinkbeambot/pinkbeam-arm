import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const listEscalationsQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  type: z.enum(['clarification', 'approval', 'error', 'edge_case', 'policy_violation']).optional(),
  agent_id: z.string().uuid().optional(),
  search: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * @openapi
 * /escalations:
 *   get:
 *     summary: List escalations
 *     description: List escalations with filtering support including status, urgency, type, and agent
 *     tags:
 *       - Escalations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, dismissed]
 *         description: Filter by escalation status
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [low, normal, high, critical]
 *         description: Filter by urgency level
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [clarification, approval, error, edge_case, policy_violation]
 *         description: Filter by escalation type
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by agent ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of escalations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Escalation'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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

    const validatedQuery = listEscalationsQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    let dbQuery = supabase
      .from('escalations')
      .select(
        `*,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status),
        resolver:resolved_by(id, name, avatar_url)`,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (validatedQuery.status) dbQuery = dbQuery.eq('status', validatedQuery.status);
    if (validatedQuery.urgency) dbQuery = dbQuery.eq('urgency', validatedQuery.urgency);
    if (validatedQuery.type) dbQuery = dbQuery.eq('type', validatedQuery.type);
    if (validatedQuery.agent_id) dbQuery = dbQuery.eq('agent_id', validatedQuery.agent_id);
    if (validatedQuery.search) {
      dbQuery = dbQuery.or(`title.ilike.%${validatedQuery.search}%,description.ilike.%${validatedQuery.search}%`);
    }

    const { data: escalations, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching escalations:', error);
      return NextResponse.json({ error: 'Failed to fetch escalations', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: escalations?.map((e) => ({ ...e, agent: e.agent || undefined, task: e.task || undefined, resolver: e.resolver || undefined })),
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createEscalationSchema = z.object({
  agent_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  type: z.enum(['clarification', 'approval', 'error', 'edge_case', 'policy_violation']),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  situation_context: z.record(z.string(), z.unknown()).optional(),
  question: z.object({ title: z.string().optional(), details: z.string().optional(), options: z.array(z.string()).optional() }).optional(),
  agent_analysis: z.object({ what_i_know: z.string().optional(), what_i_dont_know: z.string().optional(), what_i_tried: z.array(z.string()).optional(), suggested_resolution: z.string().optional() }).optional(),
});

/**
 * @openapi
 * /escalations:
 *   post:
 *     summary: Create a new escalation
 *     description: Create an escalation request from an agent including situation context and agent analysis
 *     tags:
 *       - Escalations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEscalationInput'
 *     responses:
 *       201:
 *         description: Escalation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Escalation'
 *       400:
 *         description: Validation error or invalid agent/task
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const body = await request.json();
    const validatedData = createEscalationSchema.parse(body);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', validatedData.agent_id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 400 });
    }

    if (validatedData.task_id) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', validatedData.task_id)
        .eq('tenant_id', tenantId)
        .single();
      if (taskError || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 400 });
      }
    }

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
      .select(`*, agent:agent_id(id, name, avatar_url, role, status), task:task_id(id, title, status)`)
      .single();

    if (error) {
      console.error('Error creating escalation:', error);
      return NextResponse.json({ error: 'Failed to create escalation', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: escalation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

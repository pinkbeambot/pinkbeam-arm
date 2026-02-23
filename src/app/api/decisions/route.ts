import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { createDecisionSchema, listDecisionsQuerySchema } from '@/lib/validation';
import { z } from 'zod';
import { escapeIlike } from '@/lib/utils';

/**
 * @openapi
 * /decisions:
 *   get:
 *     summary: List decisions
 *     description: List decisions with filtering support including status, category, date range, and confidence
 *     tags:
 *       - Decisions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by agent ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [proposed, approved, rejected, overridden, executed]
 *         description: Filter by decision status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [action, resource, escalation, strategy, system]
 *         description: Filter by decision category
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter decisions proposed after this date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter decisions proposed before this date
 *       - in: query
 *         name: confidence_min
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Minimum confidence threshold
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
 *         description: List of decisions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Decision'
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
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      agent_id: searchParams.get('agent_id') || undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      confidence_min: searchParams.get('confidence_min') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listDecisionsQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('decisions')
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status),
        overrider:overridden_by(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('proposed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (validatedQuery.agent_id) {
      dbQuery = dbQuery.eq('agent_id', validatedQuery.agent_id);
    }
    if (validatedQuery.status) {
      dbQuery = dbQuery.eq('status', validatedQuery.status);
    }
    if (validatedQuery.category) {
      dbQuery = dbQuery.eq('category', validatedQuery.category);
    }
    if (validatedQuery.date_from) {
      dbQuery = dbQuery.gte('proposed_at', validatedQuery.date_from);
    }
    if (validatedQuery.date_to) {
      dbQuery = dbQuery.lte('proposed_at', validatedQuery.date_to);
    }
    if (validatedQuery.confidence_min !== undefined) {
      dbQuery = dbQuery.gte('reasoning->confidence', validatedQuery.confidence_min);
    }
    if (validatedQuery.search) {
      const searchTerm = escapeIlike(validatedQuery.search);
      dbQuery = dbQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Execute query
    const { data: decisions, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching decisions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch decisions' },
        { status: 500 }
      );
    }

    // Format response
    const formattedDecisions = decisions?.map((decision) => ({
      ...decision,
      agent: decision.agent || undefined,
      task: decision.task || undefined,
      overrider: decision.overrider || undefined,
    }));

    return NextResponse.json({
      data: formattedDecisions,
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
    console.error('Unexpected error in GET /api/decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /decisions:
 *   post:
 *     summary: Create a new decision
 *     description: Propose a new decision by an agent. Includes reasoning, confidence, and risk assessment.
 *     tags:
 *       - Decisions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDecisionInput'
 *     responses:
 *       201:
 *         description: Decision created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Decision'
 *       400:
 *         description: Validation error or invalid agent/task
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body before auth to fail fast on bad input
    const body = await request.json();
    const validatedData = createDecisionSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Validate agent exists and belongs to tenant
    // Parallelize validation queries for agent and task (if provided)
    const agentPromise = supabase
      .from('agents')
      .select('id')
      .eq('id', validatedData.agent_id)
      .eq('tenant_id', tenantId)
      .single();

    const taskPromise = validatedData.task_id
      ? supabase
          .from('tasks')
          .select('id')
          .eq('id', validatedData.task_id)
          .eq('tenant_id', tenantId)
          .single()
      : Promise.resolve({ data: null, error: null });

    const [
      { data: agent, error: agentError },
      { data: task, error: taskError },
    ] = await Promise.all([agentPromise, taskPromise]);

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 400 }
      );
    }

    if (validatedData.task_id && (taskError || !task)) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 400 }
      );
    }

    // Create the decision
    const { data: decision, error } = await supabase
      .from('decisions')
      .insert({
        tenant_id: tenantId,
        agent_id: validatedData.agent_id,
        task_id: validatedData.task_id,
        category: validatedData.category,
        title: validatedData.title,
        description: validatedData.description,
        proposed_action: validatedData.proposed_action,
        reasoning: validatedData.reasoning,
        self_authorized: validatedData.self_authorized,
        status: 'proposed',
        proposed_at: new Date().toISOString(),
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
      console.error('Error creating decision:', error);
      return NextResponse.json(
        { error: 'Failed to create decision' },
        { status: 500 }
      );
    }

    // Activity logging is handled by database trigger

    return NextResponse.json({ data: decision }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { createAgentSchema, listAgentsQuerySchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * @openapi
 * /agents:
 *   get:
 *     summary: List agents
 *     description: List agents with filtering support including status, role, and search
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [initializing, idle, active, paused, blocked, error, escaped, terminated]
 *         description: Filter by agent status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ceo, manager, worker, specialist, system]
 *         description: Filter by agent role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in agent name and description
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
 *         description: List of agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listAgentsQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('agents')
      .select(
        `
        *,
        parent:parent_id(id, name, avatar_url, role, status),
        children:agents!parent_id(id, name, avatar_url, role, status)
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
    if (validatedQuery.role) {
      dbQuery = dbQuery.eq('role', validatedQuery.role);
    }
    if (validatedQuery.search) {
      dbQuery = dbQuery.or(`name.ilike.%${validatedQuery.search}%,description.ilike.%${validatedQuery.search}%`);
    }

    // Execute query
    const { data: agents, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    // Format response
    const formattedAgents = agents?.map((agent) => ({
      ...agent,
      parent: agent.parent || undefined,
      children: agent.children || [],
      current_task: agent.current_task || undefined,
    }));

    return NextResponse.json({
      data: formattedAgents,
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
    console.error('Unexpected error in GET /api/agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /agents:
 *   post:
 *     summary: Create a new agent
 *     description: Create a new agent with the specified configuration. Optionally specify a parent agent for hierarchical relationships.
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAgentInput'
 *     responses:
 *       201:
 *         description: Agent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Agent with this name/slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createAgentSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Calculate hierarchy values if parent is provided
    let parentDepth = 0;
    let rootId: string | null = null;

    if (validatedData.parent_id) {
      const { data: parentAgent, error: parentError } = await supabase
        .from('agents')
        .select('id, depth, root_id')
        .eq('id', validatedData.parent_id)
        .eq('tenant_id', tenantId)
        .single();

      if (parentError || !parentAgent) {
        return NextResponse.json(
          { error: 'Parent agent not found' },
          { status: 400 }
        );
      }

      parentDepth = parentAgent.depth || 0;
      rootId = parentAgent.root_id || parentAgent.id;
    }

    // Generate slug if not provided
    const slug = validatedData.slug || validatedData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Create the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        ...validatedData,
        tenant_id: tenantId,
        slug,
        depth: parentDepth + 1,
        root_id: rootId,
        status: 'initializing',
      })
      .select(
        `
        *,
        parent:parent_id(id, name, avatar_url, role, status)
      `
      )
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      // Handle unique constraint violation for slug
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An agent with this name/slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    // Activity logging is handled by database trigger

    return NextResponse.json({ data: agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

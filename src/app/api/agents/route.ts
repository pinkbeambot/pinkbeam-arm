import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { generateUniqueSlug } from '@/lib/api/slug';
import { createAgentSchema, listAgentsQuerySchema } from '@/lib/validation';
import { z } from 'zod';
import { escapeIlike } from '@/lib/utils';

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
      const searchTerm = escapeIlike(validatedQuery.search);
      dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
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
          { error: 'Parent agent not found or belongs to a different tenant' },
          { status: 400 }
        );
      }

      // Enforce max hierarchy depth (matches DB constraint agents_max_depth)
      const MAX_AGENT_DEPTH = 10;
      if ((parentAgent.depth || 0) + 1 > MAX_AGENT_DEPTH) {
        return NextResponse.json(
          { error: `Agent hierarchy cannot exceed ${MAX_AGENT_DEPTH} levels deep` },
          { status: 400 }
        );
      }

      parentDepth = parentAgent.depth || 0;
      rootId = parentAgent.root_id || parentAgent.id;
    }

    // Generate slug if not provided
    let slug: string;
    if (validatedData.slug) {
      slug = validatedData.slug;
    } else {
      try {
        slug = await generateUniqueSlug(validatedData.name, tenantId, supabase);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'error' in err && 'status' in err) {
          const slugErr = err as { error: string; status: number };
          return NextResponse.json({ error: slugErr.error }, { status: slugErr.status });
        }
        return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
      }
    }

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
      // Handle check constraint violations (hierarchy constraints)
      if (error.code === '23514') {
        if (error.message?.includes('agents_no_self_parent')) {
          return NextResponse.json(
            { error: 'An agent cannot be its own parent' },
            { status: 400 }
          );
        }
        if (error.message?.includes('agents_max_depth')) {
          return NextResponse.json(
            { error: 'Agent hierarchy cannot exceed 10 levels deep' },
            { status: 400 }
          );
        }
      }
      // Handle trigger-raised exceptions (circular hierarchy, root consistency)
      if (error.message?.includes('Circular hierarchy detected')) {
        return NextResponse.json(
          { error: 'Cannot create agent: this would create a circular hierarchy' },
          { status: 400 }
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

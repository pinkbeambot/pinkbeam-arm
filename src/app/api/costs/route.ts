/**
 * @openapi
 * /costs:
 *   get:
 *     summary: List LLM costs
 *     description: List LLM API costs with filtering support for model, provider, date range, and status
 *     tags:
 *       - Costs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *         description: Filter by LLM model
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [anthropic, openai]
 *         description: Filter by API provider
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, error, cached]
 *         description: Filter by request status
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by agent ID
 *       - in: query
 *         name: task_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by task ID
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter costs from this date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter costs to this date
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
 *         description: List of LLM costs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LLMCost'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { listCostsQuerySchema } from '@/lib/validation';
import { z } from 'zod';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      model: searchParams.get('model') || undefined,
      provider: searchParams.get('provider') || undefined,
      status: searchParams.get('status') || undefined,
      agent_id: searchParams.get('agent_id') || undefined,
      task_id: searchParams.get('task_id') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listCostsQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('llm_costs')
      .select(
        `
        *,
        agent:agent_id(id, name, role, avatar_url),
        task:task_id(id, title, status)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (validatedQuery.model) {
      dbQuery = dbQuery.eq('model', validatedQuery.model);
    }
    if (validatedQuery.provider) {
      dbQuery = dbQuery.eq('provider', validatedQuery.provider);
    }
    if (validatedQuery.status) {
      dbQuery = dbQuery.eq('status', validatedQuery.status);
    }
    if (validatedQuery.agent_id) {
      dbQuery = dbQuery.eq('agent_id', validatedQuery.agent_id);
    }
    if (validatedQuery.task_id) {
      dbQuery = dbQuery.eq('task_id', validatedQuery.task_id);
    }
    if (validatedQuery.date_from) {
      dbQuery = dbQuery.gte('created_at', validatedQuery.date_from);
    }
    if (validatedQuery.date_to) {
      dbQuery = dbQuery.lte('created_at', validatedQuery.date_to);
    }

    // Execute query
    const { data: costs, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching costs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch costs', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const formattedCosts = costs?.map((cost) => ({
      ...cost,
      agent: cost.agent || undefined,
      task: cost.task || undefined,
    }));

    return NextResponse.json({
      data: formattedCosts,
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
    console.error('Unexpected error in GET /api/costs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

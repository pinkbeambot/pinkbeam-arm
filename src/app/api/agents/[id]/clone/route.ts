import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { generateUniqueSlug } from '@/lib/api/slug';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const cloneOptionsSchema = z.object({
  /** Custom name for the clone. Defaults to "{original} (Copy)". */
  name: z.string().min(1).max(255).optional(),
  /** Override parent_id for the clone. */
  parent_id: z.string().uuid().optional().nullable(),
}).optional();

/**
 * @openapi
 * /agents/{id}/clone:
 *   post:
 *     summary: Clone an agent
 *     description: >
 *       Creates a duplicate of the specified agent, copying all configuration
 *       (role, capabilities, llm_config, limits, description) while resetting
 *       ephemeral state (status, stats, current task, timestamps).
 *       The clone starts in "initializing" status with a fresh slug.
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the agent to clone
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Custom name for the clone (default "{original} (Copy)")
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Override parent for the clone
 *     responses:
 *       201:
 *         description: Agent cloned successfully
 *       400:
 *         description: Validation error or hierarchy constraint violation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Source agent not found
 *       409:
 *         description: Agent with generated slug already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse optional body
    let options: z.infer<typeof cloneOptionsSchema> = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        options = cloneOptionsSchema.parse(JSON.parse(text));
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: err.issues },
          { status: 400 }
        );
      }
      // If body is empty or not JSON, use defaults
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Fetch the source agent
    const { data: source, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !source) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Determine clone name
    const cloneName = options?.name || `${source.name} (Copy)`;

    // Generate a unique slug
    let slug: string;
    try {
      slug = await generateUniqueSlug(cloneName, tenantId, supabase);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err && 'status' in err) {
        const slugErr = err as { error: string; status: number };
        return NextResponse.json({ error: slugErr.error }, { status: slugErr.status });
      }
      return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
    }

    // Determine parent and hierarchy values
    const parentId = options?.parent_id !== undefined ? options.parent_id : source.parent_id;
    let depth = 1;
    let rootId: string | null = null;

    if (parentId) {
      const { data: parentAgent, error: parentError } = await supabase
        .from('agents')
        .select('id, depth, root_id')
        .eq('id', parentId)
        .eq('tenant_id', tenantId)
        .single();

      if (parentError || !parentAgent) {
        return NextResponse.json(
          { error: 'Parent agent not found or belongs to a different tenant' },
          { status: 400 }
        );
      }

      const MAX_AGENT_DEPTH = 10;
      if ((parentAgent.depth || 0) + 1 > MAX_AGENT_DEPTH) {
        return NextResponse.json(
          { error: `Agent hierarchy cannot exceed ${MAX_AGENT_DEPTH} levels deep` },
          { status: 400 }
        );
      }

      depth = (parentAgent.depth || 0) + 1;
      rootId = parentAgent.root_id || parentAgent.id;
    }

    // Build the clone — copy config fields, reset ephemeral state
    const cloneData = {
      tenant_id: tenantId,
      name: cloneName,
      slug,
      role: source.role,
      description: source.description,
      avatar_url: source.avatar_url,
      capabilities: source.capabilities,
      model: source.model,
      configuration: source.configuration,
      llm_config: source.llm_config,
      limits: source.limits,
      metadata: {
        ...(source.metadata || {}),
        cloned_from: source.id,
        cloned_at: new Date().toISOString(),
      },
      parent_id: parentId,
      root_id: rootId,
      depth,
      // Reset ephemeral state
      status: 'initializing' as const,
      current_task_id: null,
      stats: {
        tasks_completed: 0,
        tasks_failed: 0,
        escalations_raised: 0,
        avg_task_duration_seconds: 0,
        total_cost_usd: 0,
      },
    };

    const { data: clone, error: insertError } = await supabase
      .from('agents')
      .insert(cloneData)
      .select(
        `
        *,
        parent:parent_id(id, name, avatar_url, role, status),
        children:agents!parent_id(id, name, avatar_url, role, status)
      `
      )
      .single();

    if (insertError) {
      console.error('Error cloning agent:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'An agent with this name/slug already exists' },
          { status: 409 }
        );
      }
      if (insertError.message?.includes('Circular hierarchy detected')) {
        return NextResponse.json(
          { error: 'Cannot clone agent: this would create a circular hierarchy' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to clone agent' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: clone,
        cloned_from: {
          id: source.id,
          name: source.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/agents/:id/clone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

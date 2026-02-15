import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { generateUniqueSlug } from '@/lib/api/slug';
import { z } from 'zod';

const llmConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
});

const limitsSchema = z.object({
  max_sub_agents: z.number().int().nonnegative().optional(),
  max_concurrent_tasks: z.number().int().nonnegative().optional(),
  escalation_threshold: z.number().min(0).max(1).optional(),
  timeout_seconds: z.number().int().positive().optional(),
  max_tokens_per_task: z.number().int().positive().optional(),
  max_cost_per_task_usd: z.number().nonnegative().optional(),
});

const importConfigSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']),
  description: z.string().max(2000).optional(),
  capabilities: z.array(z.string()).optional(),
  model: z.string().optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
  llm_config: llmConfigSchema.optional(),
  limits: limitsSchema.optional(),
});

const importAgentSchema = z.object({
  version: z.string(),
  config: importConfigSchema,
  /** Optional overrides applied on top of the imported config */
  overrides: z.object({
    name: z.string().min(1).max(255).optional(),
    parent_id: z.string().uuid().optional(),
  }).optional(),
});

/**
 * @openapi
 * /agents/import:
 *   post:
 *     summary: Import an agent from exported configuration
 *     description: >
 *       Creates a new agent from a previously exported configuration JSON.
 *       The imported agent starts in "initializing" status with fresh stats.
 *       Optionally override the name or parent via the `overrides` field.
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [version, config]
 *             properties:
 *               version:
 *                 type: string
 *               config:
 *                 type: object
 *               overrides:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   parent_id:
 *                     type: string
 *                     format: uuid
 *     responses:
 *       201:
 *         description: Agent imported successfully
 *       400:
 *         description: Validation error or invalid config
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Agent with generated slug already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = importAgentSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { config, overrides } = validated;
    const name = overrides?.name || config.name;
    const parentId = overrides?.parent_id || null;

    // Generate slug
    let slug: string;
    try {
      slug = await generateUniqueSlug(name, tenantId, supabase);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err && 'status' in err) {
        const slugErr = err as { error: string; status: number };
        return NextResponse.json({ error: slugErr.error }, { status: slugErr.status });
      }
      return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
    }

    // Calculate hierarchy
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
          { error: 'Parent agent not found' },
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

    const agentData = {
      tenant_id: tenantId,
      name,
      slug,
      role: config.role,
      description: config.description,
      capabilities: config.capabilities || [],
      model: config.model,
      configuration: config.configuration,
      llm_config: config.llm_config,
      limits: config.limits,
      parent_id: parentId,
      root_id: rootId,
      depth,
      status: 'initializing' as const,
      metadata: {
        imported_at: new Date().toISOString(),
      },
    };

    const { data: agent, error: insertError } = await supabase
      .from('agents')
      .insert(agentData)
      .select(
        `
        *,
        parent:parent_id(id, name, avatar_url, role, status)
      `
      )
      .single();

    if (insertError) {
      console.error('Error importing agent:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'An agent with this name/slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to import agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid agent configuration', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agents/import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

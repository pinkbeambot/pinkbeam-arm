import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Portable agent configuration format.
 * Contains only the fields needed to recreate an agent — no IDs,
 * no ephemeral state, no tenant-specific data.
 */
export interface AgentConfigExport {
  /** Schema version for forward compatibility */
  version: '1.0';
  /** ISO timestamp of the export */
  exported_at: string;
  /** Source agent metadata (informational only) */
  source: {
    id: string;
    name: string;
  };
  /** The portable configuration */
  config: {
    name: string;
    role: string;
    description?: string;
    capabilities: string[];
    model?: string;
    configuration?: Record<string, unknown>;
    llm_config?: {
      provider: string;
      model: string;
      temperature?: number;
      max_tokens?: number;
    };
    limits?: {
      max_sub_agents?: number;
      max_concurrent_tasks?: number;
      escalation_threshold?: number;
      timeout_seconds?: number;
      max_tokens_per_task?: number;
      max_cost_per_task_usd?: number;
    };
  };
}

/**
 * @openapi
 * /agents/{id}/export:
 *   get:
 *     summary: Export agent configuration
 *     description: >
 *       Returns a portable JSON representation of the agent's configuration.
 *       Excludes tenant-specific data, ephemeral state, IDs, and stats.
 *       The exported config can be imported via POST /api/agents/import.
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
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent configuration exported
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: string
 *                 exported_at:
 *                   type: string
 *                   format: date-time
 *                 source:
 *                   type: object
 *                 config:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, role, description, capabilities, model, configuration, llm_config, limits')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const exportData: AgentConfigExport = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      source: {
        id: agent.id,
        name: agent.name,
      },
      config: {
        name: agent.name,
        role: agent.role,
        description: agent.description || undefined,
        capabilities: agent.capabilities || [],
        model: agent.model || undefined,
        configuration: agent.configuration || undefined,
        llm_config: agent.llm_config || undefined,
        limits: agent.limits || undefined,
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Unexpected error in GET /api/agents/:id/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

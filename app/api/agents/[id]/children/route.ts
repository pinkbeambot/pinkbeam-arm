import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { z } from 'zod';

// Query schema for children endpoint
const childrenQuerySchema = z.object({
  recursive: z.coerce.boolean().default(false),
  include_terminated: z.coerce.boolean().default(false),
});

// Type for agent in tree structure
interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: string;
  slug: string | null;
  description: string | null;
  capabilities: string[];
  depth: number;
  parent_id: string | null;
  root_id: string | null;
  created_at: string;
  updated_at: string;
  children?: AgentNode[];
}

/**
 * GET /api/agents/[id]/children
 *
 * Get child agents (direct descendants) of an agent.
 * With recursive=true, includes all descendants in a tree structure.
 *
 * Path Parameters:
 * - id: Agent UUID (required)
 *
 * Query Parameters:
 * - recursive: Include all descendants (default: false)
 * - include_terminated: Include terminated agents (default: false)
 *
 * Response (non-recursive): { data: Agent[] }
 * Response (recursive): { data: AgentNode[] } - Tree structure with nested children
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = childrenQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { recursive, include_terminated } = validationResult.data;

    // Verify agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (agentError || !agent) {
      return apiError('Agent not found', 404);
    }

    if (recursive) {
      // Get all descendants using the recursive function
      const { data: descendants, error: descendantsError } = await supabase
        .rpc('get_agent_descendants', { p_agent_id: id });

      if (descendantsError) {
        console.error('Error fetching descendants:', descendantsError);
        return apiError('Failed to fetch agent descendants', 500);
      }

      // If no descendants, return empty array
      if (!descendants || descendants.length === 0) {
        return apiSuccess([]);
      }

      // Fetch full agent details for all descendants
      const descendantIds = descendants.map((d: { id: string }) => d.id);
      // Remove the parent agent itself from the list
      const childIds = descendantIds.filter((childId: string) => childId !== id);

      if (childIds.length === 0) {
        return apiSuccess([]);
      }

      let query = supabase
        .from('agents')
        .select('id, name, role, status, slug, description, capabilities, depth, parent_id, root_id, created_at, updated_at')
        .in('id', childIds)
        .eq('tenant_id', tenantId);

      if (!include_terminated) {
        query = query.neq('status', 'terminated');
      }

      const { data: agents, error: agentsError } = await query;

      if (agentsError) {
        console.error('Error fetching agent details:', agentsError);
        return apiError('Failed to fetch agent details', 500);
      }

      // Build tree structure
      const agentMap = new Map<string, AgentNode>();
      const rootNodes: AgentNode[] = [];

      // First pass: create nodes
      agents?.forEach((agent) => {
        agentMap.set(agent.id, { ...agent, children: [] });
      });

      // Second pass: build hierarchy
      agents?.forEach((agent) => {
        const node = agentMap.get(agent.id)!;
        if (agent.parent_id && agentMap.has(agent.parent_id)) {
          const parent = agentMap.get(agent.parent_id)!;
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else if (agent.parent_id === id) {
          // Direct child of the requested agent
          rootNodes.push(node);
        }
      });

      return apiSuccess(rootNodes);
    } else {
      // Get only direct children
      let query = supabase
        .from('agents')
        .select('id, name, role, status, slug, description, capabilities, depth, parent_id, root_id, created_at, updated_at')
        .eq('parent_id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (!include_terminated) {
        query = query.neq('status', 'terminated');
      }

      const { data: children, error: childrenError } = await query.order('created_at', { ascending: false });

      if (childrenError) {
        console.error('Error fetching children:', childrenError);
        return apiError('Failed to fetch child agents', 500);
      }

      return apiSuccess(children || []);
    }
  } catch (err) {
    console.error('Agent children GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

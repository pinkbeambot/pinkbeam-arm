import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import {
  createEscalationSchema,
  listEscalationsQuerySchema,
} from '@/lib/validation';

/**
 * GET /api/escalations
 *
 * List all escalations for the current tenant with pagination and filtering.
 *
 * Query Parameters:
 * - status: Filter by escalation status (open, in_progress, resolved, dismissed)
 * - urgency: Filter by urgency level (low, normal, high, critical)
 * - type: Filter by escalation type (clarification, approval, error, edge_case, policy_violation)
 * - agent_id: Filter by agent who raised the escalation
 * - search: Search in title and description (case-insensitive)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Response: { data: Escalation[], pagination: Pagination }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = listEscalationsQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const {
      status,
      urgency,
      type,
      agent_id,
      search,
      page,
      limit,
    } = validationResult.data;

    // Calculate offset from page
    const offset = (page - 1) * limit;

    // Build the query with count
    let query = supabase
      .from('escalations')
      .select(
        `*,
        agent:agent_id(id, name, role, status),
        task:task_id(id, title, status),
        resolver:resolved_by(id, email, name)
        `,
        { count: 'exact' }
      );

    // Apply tenant filter (RLS handles this, but explicit is clearer)
    query = query.eq('tenant_id', tenantId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    // Search in title and description (case-insensitive)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Execute query with pagination - order by urgency (critical first) then created_at
    const { data, error, count } = await query
      .order('urgency', { ascending: false }) // critical > high > normal > low
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Escalations GET error:', error);
      return apiError('Failed to fetch escalations', 500, error.message);
    }

    // Calculate pagination
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return apiSuccessList(data || [], {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error('Escalations GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * POST /api/escalations
 *
 * Create a new escalation for the current tenant.
 *
 * Body Parameters:
 * - agent_id: Agent UUID who is raising the escalation (required)
 * - task_id: Related task UUID (optional)
 * - type: Escalation type - clarification, approval, error, edge_case, policy_violation (required)
 * - urgency: Urgency level - low, normal, high, critical (default: normal)
 * - title: Escalation title (required, 1-500 chars)
 * - description: Detailed description (required)
 * - situation_context: JSON object with context (optional)
 * - question: Question details with title, details, options (optional)
 * - agent_analysis: Agent's analysis with what_i_know, what_i_dont_know, etc. (optional)
 *
 * Response: { data: Escalation } (201 Created)
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createEscalationSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const escalationData = validationResult.data;

    // Verify the agent belongs to the same tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, tenant_id, status')
      .eq('id', escalationData.agent_id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return apiError('Agent not found or access denied', 404);
    }

    // Check if agent is terminated
    if (agent.status === 'terminated') {
      return apiError('Cannot create escalation for a terminated agent', 400);
    }

    // If task_id is provided, verify it belongs to the same tenant
    if (escalationData.task_id) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, tenant_id')
        .eq('id', escalationData.task_id)
        .eq('tenant_id', tenantId)
        .single();

      if (taskError || !task) {
        return apiError('Task not found or access denied', 404);
      }
    }

    // Calculate SLA deadline based on urgency
    const slaDeadlineAt = calculateSLADeadline(escalationData.urgency);

    // Prepare escalation data with tenant context
    const newEscalation = {
      ...escalationData,
      tenant_id: tenantId,
      status: 'open' as const,
      sla_deadline_at: slaDeadlineAt,
    };

    // Insert the escalation
    const { data, error } = await supabase
      .from('escalations')
      .insert(newEscalation)
      .select(
        `*,
        agent:agent_id(id, name, role, status),
        task:task_id(id, title, status)
        `
      )
      .single();

    if (error) {
      console.error('Escalations POST error:', error);
      return apiError('Failed to create escalation', 500, error.message);
    }

    return apiSuccess(data, 201);
  } catch (err) {
    console.error('Escalations POST exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * Calculate SLA deadline based on urgency level
 */
function calculateSLADeadline(urgency: string): string {
  const now = new Date();

  switch (urgency) {
    case 'critical':
      // 1 hour SLA for critical
      now.setHours(now.getHours() + 1);
      break;
    case 'high':
      // 4 hours SLA for high
      now.setHours(now.getHours() + 4);
      break;
    case 'normal':
      // 24 hours SLA for normal
      now.setHours(now.getHours() + 24);
      break;
    case 'low':
      // 72 hours SLA for low
      now.setHours(now.getHours() + 72);
      break;
    default:
      // Default to 24 hours
      now.setHours(now.getHours() + 24);
  }

  return now.toISOString();
}

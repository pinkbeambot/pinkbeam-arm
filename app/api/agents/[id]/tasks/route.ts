import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import { z } from 'zod';

// Valid task statuses
const TaskStatusEnum = z.enum([
  'queued',
  'in_progress',
  'blocked',
  'review',
  'completed',
  'failed',
  'cancelled',
]);

const TaskPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);

// Query schema for tasks endpoint
const agentTasksQuerySchema = z.object({
  status: z.union([TaskStatusEnum, z.array(TaskStatusEnum)]).optional(),
  priority: TaskPriorityEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  include_completed: z.coerce.boolean().default(false),
  sort: z.enum(['created_at', 'updated_at', 'deadline_at', 'priority']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/agents/[id]/tasks
 *
 * Get tasks assigned to an agent.
 * By default, returns only active tasks (queued, in_progress, blocked, review).
 *
 * Path Parameters:
 * - id: Agent UUID (required)
 *
 * Query Parameters:
 * - status: Filter by status (single or array)
 * - priority: Filter by priority (low, normal, high, urgent)
 * - include_completed: Include completed/failed/cancelled tasks (default: false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort: Sort field (created_at, updated_at, deadline_at, priority) (default: created_at)
 * - order: Sort order (asc, desc) (default: desc)
 *
 * Response: { data: Task[], pagination: { total, page, limit, totalPages } }
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
    const validationResult = agentTasksQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const {
      status,
      priority,
      page,
      limit,
      include_completed,
      sort,
      order,
    } = validationResult.data;

    // Calculate offset from page
    const offset = (page - 1) * limit;

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

    // Build the query with count
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // Apply tenant filter
    query = query.eq('tenant_id', tenantId);

    // Apply agent filter
    query = query.eq('assignee_id', id);

    // Apply status filter
    const activeStatuses = ['queued', 'in_progress', 'blocked', 'review'];
    const terminalStatuses = ['completed', 'failed', 'cancelled'];

    if (status) {
      // Specific status filter provided
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    } else if (!include_completed) {
      // Default: only active tasks
      query = query.in('status', activeStatuses);
    }

    // Apply priority filter
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Apply sorting
    const sortColumn = sort;
    query = query.order(sortColumn, { ascending: order === 'asc' });

    // Add secondary sort by priority for consistent ordering
    if (sortColumn !== 'priority') {
      query = query.order('priority', { ascending: false });
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Agent tasks GET error:', error);
      return apiError('Failed to fetch agent tasks', 500, error.message);
    }

    // Calculate pagination
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Calculate stats
    const stats = {
      total,
      active: data?.filter((t: { status: string }) => activeStatuses.includes(t.status)).length || 0,
      completed: data?.filter((t: { status: string }) => t.status === 'completed').length || 0,
      failed: data?.filter((t: { status: string }) => t.status === 'failed').length || 0,
    };

    return apiSuccessList(data || [], {
      page,
      limit,
      total,
      totalPages,
    }, {
      agent: {
        id: agent.id,
        name: agent.name,
      },
      stats,
      filters: {
        status,
        priority,
        include_completed,
      },
    });
  } catch (err) {
    console.error('Agent tasks GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

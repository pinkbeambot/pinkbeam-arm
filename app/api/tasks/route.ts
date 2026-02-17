/**
 * Tasks API Route
 * 
 * GET  /api/tasks - List tasks with filters
 * POST /api/tasks - Create a new task
 * 
 * Features:
 * - Filtering by status, priority, assignee, due date
 * - Pagination with page/limit
 * - Sorting by created_at, updated_at, deadline_at, priority
 * - Search by title/description
 * - RLS tenant isolation
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import {
  createTaskSchema,
  enhancedListTasksQuerySchema,
} from '@/lib/validation';
import type { TaskStatus, TaskPriority } from '@/lib/database';

/**
 * GET /api/tasks
 * 
 * List all tasks for the current tenant with filtering and pagination.
 * 
 * Query Parameters:
 * - status: Filter by status (single or comma-separated: 'queued,in_progress')
 * - priority: Filter by priority (low, normal, high, urgent)
 * - agent_id: Filter by assigned agent ID
 * - assignee_id: Filter by assignee ID (alias for agent_id)
 * - parent_id: Filter by parent task ID
 * - due_before: Filter tasks due before ISO date
 * - due_after: Filter tasks due after ISO date
 * - search: Search in title/description
 * - sort: Sort field (created_at, updated_at, deadline_at, priority)
 * - order: Sort order (asc, desc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * 
 * Response: { data: Task[], pagination: Pagination, meta?: { filters: {} } }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = enhancedListTasksQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const {
      status,
      priority,
      agent_id,
      assignee_id,
      parent_id,
      due_before,
      due_after,
      search,
      sort,
      order,
      page,
      limit,
    } = validationResult.data;

    // Calculate offset from page
    const offset = (page - 1) * limit;

    // Build the query with count
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // Apply tenant filter (RLS handles this, but explicit is clearer)
    query = query.eq('tenant_id', tenantId);

    // Apply status filter (supports multiple statuses)
    if (status && Array.isArray(status) && status.length > 0) {
      if (status.length === 1) {
        query = query.eq('status', status[0]);
      } else {
        query = query.in('status', status);
      }
    }

    // Apply priority filter
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Apply assignee filter (agent_id or assignee_id)
    const effectiveAssigneeId = assignee_id || agent_id;
    if (effectiveAssigneeId) {
      query = query.eq('assignee_id', effectiveAssigneeId);
    }

    // Apply parent filter
    if (parent_id !== undefined) {
      if (parent_id === null) {
        query = query.is('parent_task_id', null);
      } else {
        query = query.eq('parent_task_id', parent_id);
      }
    }

    // Apply due date filters
    if (due_before) {
      query = query.lte('deadline_at', due_before);
    }
    if (due_after) {
      query = query.gte('deadline_at', due_after);
    }

    // Apply search filter (title/description)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    const sortColumn = sort === 'priority' 
      ? 'priority' 
      : sort === 'deadline_at' 
        ? 'deadline_at' 
        : sort === 'updated_at' 
          ? 'updated_at' 
          : 'created_at';
    
    query = query.order(sortColumn, { ascending: order === 'asc' });

    // Add secondary sort by priority for consistent ordering
    if (sortColumn !== 'priority') {
      query = query.order('priority', { ascending: false });
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Tasks GET error:', error);
      return apiError('Failed to fetch tasks', 500, error.message);
    }

    // Calculate pagination
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return apiSuccessList(data || [], {
      page,
      limit,
      total,
      totalPages,
    }, {
      filters: {
        status,
        priority,
        assignee_id: effectiveAssigneeId,
        parent_id,
        due_before,
        due_after,
        search,
      },
    });
  } catch (err) {
    console.error('Tasks GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

/**
 * POST /api/tasks
 * 
 * Create a new task for the current tenant.
 * 
 * Body Parameters:
 * - title: Task title (required, 1-500 chars)
 * - description: Task description (optional, max 10000 chars)
 * - type: Task type (optional, default: 'generic')
 * - assignee_id: Assigned agent ID (optional)
 * - priority: Task priority (optional: low, normal, high, urgent)
 * - parent_task_id: Parent task ID for subtasks (optional)
 * - inputs: Task inputs as JSON object (optional)
 * - expected_outputs: Expected outputs as JSON object (optional)
 * - deadline_at: Due date in ISO 8601 format (optional)
 * 
 * Response: { data: Task } (201 Created)
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, userId, supabase } = auth;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const taskData = validationResult.data;

    // If assignee_id is provided, verify the agent belongs to the same tenant
    if (taskData.assignee_id) {
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, tenant_id')
        .eq('id', taskData.assignee_id)
        .eq('tenant_id', tenantId)
        .single();

      if (agentError || !agent) {
        return apiError('Assignee agent not found or access denied', 404);
      }
    }

    // If parent_task_id is provided, verify it belongs to the same tenant
    let parentDepth = 0;
    if (taskData.parent_task_id) {
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .select('id, tenant_id, depth, status')
        .eq('id', taskData.parent_task_id)
        .eq('tenant_id', tenantId)
        .single();

      if (parentError || !parentTask) {
        return apiError('Parent task not found or access denied', 404);
      }

      parentDepth = parentTask.depth || 0;

      // Don't allow adding subtasks to completed/cancelled/failed tasks
      if (['completed', 'cancelled', 'failed'].includes(parentTask.status)) {
        return apiError(
          'Cannot add subtasks to a completed, cancelled, or failed task',
          400
        );
      }
    }

    // Prepare task data with tenant context
    const newTask = {
      ...taskData,
      tenant_id: tenantId,
      assigner_id: userId,
      status: 'queued' as TaskStatus,
      depth: parentDepth + 1,
    };

    // Insert the task
    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (error) {
      console.error('Tasks POST error:', error);
      return apiError('Failed to create task', 500, error.message);
    }

    return apiSuccess(data, 201);
  } catch (err) {
    console.error('Tasks POST exception:', err);
    return apiError('Internal server error', 500);
  }
}

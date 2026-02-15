import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import {
  createTaskSchema,
  listTasksQuerySchema,
  enhancedListTasksQuerySchema
} from '@/lib/validation';
import { z } from 'zod';
import { escapeIlike } from '@/lib/utils';

// Priority order mapping for sorting
const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: List tasks
 *     description: List tasks with advanced filtering including status, priority, assignee, date ranges, and search
 *     tags:
 *       - Tasks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, in_progress, blocked, review, completed, failed, cancelled]
 *         description: Filter by task status (can be comma-separated for multiple)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         description: Filter by task priority
 *       - in: query
 *         name: assignee_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by assignee agent ID
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alias for assignee_id
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by parent task ID (use 'null' for root tasks)
 *       - in: query
 *         name: due_before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tasks due before this date
 *       - in: query
 *         name: due_after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tasks due after this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, deadline_at, priority]
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
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
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     filters:
 *                       type: object
 *                     sort:
 *                       type: object
 *                       properties:
 *                         field:
 *                           type: string
 *                         order:
 *                           type: string
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Check if using enhanced filtering
    const useEnhanced = searchParams.has('sort') || 
                       searchParams.has('search') || 
                       searchParams.has('due_before') ||
                       searchParams.get('status')?.includes(',');
    
    let validatedQuery;
    let page: number;
    let limit: number;
    let sort: string;
    let order: string;

    if (useEnhanced) {
      // Use enhanced schema
      const queryParams = {
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
        agent_id: searchParams.get('agent_id') || searchParams.get('assignee_id') || undefined,
        assignee_id: searchParams.get('assignee_id') || undefined,
        parent_id: searchParams.get('parent_id') || undefined,
        due_before: searchParams.get('due_before') || undefined,
        due_after: searchParams.get('due_after') || undefined,
        search: searchParams.get('search') || undefined,
        sort: searchParams.get('sort') || 'created_at',
        order: searchParams.get('order') || 'desc',
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '20',
      };
      validatedQuery = enhancedListTasksQuerySchema.parse(queryParams);
      page = validatedQuery.page;
      limit = validatedQuery.limit;
      sort = validatedQuery.sort;
      order = validatedQuery.order;
    } else {
      // Use basic schema for backward compatibility
      const queryParams = {
        status: searchParams.get('status') || undefined,
        assignee_id: searchParams.get('assignee_id') || undefined,
        priority: searchParams.get('priority') || undefined,
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '20',
      };
      validatedQuery = listTasksQuerySchema.parse(queryParams);
      page = validatedQuery.page;
      limit = validatedQuery.limit;
      sort = 'created_at';
      order = 'desc';
    }

    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url),
        parent:parent_task_id(id, title, status),
        dependencies:task_dependencies!task_id(id, depends_on_task_id, dependency_type),
        blocked_by:task_dependencies!depends_on_task_id(id, task_id, dependency_type)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId);

    // Apply filters
    if (validatedQuery.status) {
      if (Array.isArray(validatedQuery.status) && validatedQuery.status.length > 0) {
        // Multiple statuses
        dbQuery = dbQuery.in('status', validatedQuery.status);
      } else if (typeof validatedQuery.status === 'string') {
        // Single status (basic schema)
        dbQuery = dbQuery.eq('status', validatedQuery.status);
      }
    }

    if (validatedQuery.priority) {
      dbQuery = dbQuery.eq('priority', validatedQuery.priority);
    }

    // Handle both agent_id and assignee_id
    const agentId = (validatedQuery as { agent_id?: string }).agent_id || validatedQuery.assignee_id;
    if (agentId) {
      dbQuery = dbQuery.eq('assignee_id', agentId);
    }

    // Parent filter
    if ('parent_id' in validatedQuery) {
      const parentId = (validatedQuery as { parent_id?: string | null }).parent_id;
      if (parentId === null) {
        dbQuery = dbQuery.is('parent_task_id', null);
      } else if (parentId) {
        dbQuery = dbQuery.eq('parent_task_id', parentId);
      }
    }

    // Date range filters
    if ('due_before' in validatedQuery && validatedQuery.due_before) {
      dbQuery = dbQuery.lte('deadline_at', validatedQuery.due_before);
    }
    if ('due_after' in validatedQuery && validatedQuery.due_after) {
      dbQuery = dbQuery.gte('deadline_at', validatedQuery.due_after);
    }

    // Search in title and description
    if ('search' in validatedQuery && validatedQuery.search) {
      const searchTerm = escapeIlike(validatedQuery.search);
      dbQuery = dbQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Apply sorting
    if (sort === 'priority') {
      // Custom priority sorting using the enum order
      dbQuery = dbQuery.order('priority', { 
        ascending: order === 'asc',
        foreignTable: undefined,
        nullsFirst: false
      });
    } else if (sort === 'deadline_at') {
      dbQuery = dbQuery.order('deadline_at', { 
        ascending: order === 'asc',
        nullsFirst: order === 'desc' // Show null deadlines last when sorting desc
      });
    } else {
      dbQuery = dbQuery.order(sort, { ascending: order === 'asc' });
    }

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    // Execute query
    const { data: tasks, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // Format response
    const formattedTasks = tasks?.map((task) => ({
      ...task,
      assignee: task.assignee || undefined,
      assigner: task.assigner || undefined,
      parent: task.parent || undefined,
      dependencies: task.dependencies || [],
      blocked_by: task.blocked_by || [],
    }));

    return NextResponse.json({
      data: formattedTasks,
      meta: {
        filters: {
          status: validatedQuery.status,
          priority: validatedQuery.priority,
          agent_id: agentId,
          parent_id: 'parent_id' in validatedQuery ? (validatedQuery as { parent_id?: string | null }).parent_id : undefined,
          due_before: 'due_before' in validatedQuery ? (validatedQuery as { due_before?: string }).due_before : undefined,
          due_after: 'due_after' in validatedQuery ? (validatedQuery as { due_after?: string }).due_after : undefined,
          search: 'search' in validatedQuery ? (validatedQuery as { search?: string }).search : undefined,
        },
        sort: { field: sort, order },
      },
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
    console.error('Unexpected error in GET /api/tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Create a new task and optionally assign it to an agent. Supports parent-child task relationships.
 *     tags:
 *       - Tasks
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error or invalid assignee/parent
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Validate assignee exists and belongs to tenant (if provided)
    if (validatedData.assignee_id) {
      const { data: assignee, error: assigneeError } = await supabase
        .from('agents')
        .select('id')
        .eq('id', validatedData.assignee_id)
        .eq('tenant_id', tenantId)
        .single();

      if (assigneeError || !assignee) {
        return NextResponse.json(
          { error: 'Assignee agent not found' },
          { status: 400 }
        );
      }
    }

    // Validate parent task exists and belongs to tenant (if provided)
    let parentDepth = 0;
    if (validatedData.parent_task_id) {
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .select('id, depth')
        .eq('id', validatedData.parent_task_id)
        .eq('tenant_id', tenantId)
        .single();

      if (parentError || !parentTask) {
        return NextResponse.json(
          { error: 'Parent task not found' },
          { status: 400 }
        );
      }

      parentDepth = parentTask.depth || 0;
    }

    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...validatedData,
        tenant_id: tenantId,
        assigner_id: auth.userId, // Set the user who created the task
        depth: parentDepth + 1,
      })
      .select(
        `
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    // Activity logging is handled by database trigger

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

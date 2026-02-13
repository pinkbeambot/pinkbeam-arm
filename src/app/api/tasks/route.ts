import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { 
  createTaskSchema, 
  listTasksQuerySchema,
  enhancedListTasksQuerySchema 
} from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Priority order mapping for sorting
const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };

/**
 * GET /api/tasks
 * List tasks with advanced filtering support
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
      const searchTerm = validatedQuery.search;
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
        { error: 'Failed to fetch tasks', details: error.message },
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
 * POST /api/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Create Supabase client with user's token
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user to extract tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const tenantId = userProfile.tenant_id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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
        assigner_id: user.id, // Set the user who created the task
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
        { error: 'Failed to create task', details: error.message },
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

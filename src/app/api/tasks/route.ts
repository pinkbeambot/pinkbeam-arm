import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createTaskSchema, listTasksQuerySchema } from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/tasks
 * List tasks with filtering support
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
    const queryParams = {
      status: searchParams.get('status') || undefined,
      assignee_id: searchParams.get('assignee_id') || undefined,
      priority: searchParams.get('priority') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listTasksQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Build the query
    let dbQuery = supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url),
        dependencies:task_dependencies!task_id(id, depends_on_task_id, dependency_type),
        blocked_by:task_dependencies!depends_on_task_id(id, task_id, dependency_type)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (validatedQuery.status) {
      dbQuery = dbQuery.eq('status', validatedQuery.status);
    }
    if (validatedQuery.assignee_id) {
      dbQuery = dbQuery.eq('assignee_id', validatedQuery.assignee_id);
    }
    if (validatedQuery.priority) {
      dbQuery = dbQuery.eq('priority', validatedQuery.priority);
    }

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
      dependencies: task.dependencies || [],
      blocked_by: task.blocked_by || [],
    }));

    return NextResponse.json({
      data: formattedTasks,
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

      // Calculate depth
      var parentDepth = parentTask.depth || 0;
    }

    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...validatedData,
        tenant_id: tenantId,
        assigner_id: user.id, // Set the user who created the task
        depth: (parentDepth || 0) + 1,
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

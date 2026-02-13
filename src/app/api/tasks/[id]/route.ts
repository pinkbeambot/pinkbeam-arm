import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { updateTaskSchema } from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/tasks/:id
 * Get a single task by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Fetch task with all related data
    const { data: task, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url),
        parent:parent_task_id(id, title, status),
        subtasks:tasks!parent_task_id(id, title, status, priority, assignee_id),
        dependencies:task_dependencies!task_id(
          id,
          depends_on_task_id,
          dependency_type,
          depends_on:depends_on_task_id(id, title, status)
        ),
        blocked_by:task_dependencies!depends_on_task_id(
          id,
          task_id,
          dependency_type,
          blocking_task:task_id(id, title, status)
        )
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error fetching task:', error);
      return NextResponse.json(
        { error: 'Failed to fetch task', details: error.message },
        { status: 500 }
      );
    }

    // Fetch related decisions
    const { data: decisions } = await supabase
      .from('decisions')
      .select('id, title, status, confidence, proposed_at')
      .eq('task_id', id)
      .eq('tenant_id', tenantId)
      .order('proposed_at', { ascending: false })
      .limit(10);

    // Fetch related escalations
    const { data: escalations } = await supabase
      .from('escalations')
      .select('id, title, status, urgency, created_at')
      .eq('task_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent activities for this task
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('task_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      data: {
        ...task,
        decisions: decisions || [],
        escalations: escalations || [],
        activity_history: activities || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/:id
 * Update a task
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

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

    // Check if task exists and belongs to tenant
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Validate assignee exists and belongs to tenant (if changing)
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

    // Set timestamps based on status changes
    const updateData: Record<string, unknown> = { ...validatedData };

    if (validatedData.status === 'in_progress' && existingTask.status === 'queued') {
      updateData.started_at = new Date().toISOString();
    }

    if (
      ['completed', 'failed', 'cancelled'].includes(validatedData.status || '') &&
      !['completed', 'failed', 'cancelled'].includes(existingTask.status)
    ) {
      updateData.completed_at = new Date().toISOString();
    }

    // Update the task
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(
        `
        *,
        assignee:assignee_id(id, name, avatar_url, status, role),
        assigner:assigner_id(id, name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json(
        { error: 'Failed to update task', details: error.message },
        { status: 500 }
      );
    }

    // Activity logging is handled by database triggers
    // Task dependency auto-unblocking is handled by check_task_dependencies trigger

    return NextResponse.json({ data: task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in PATCH /api/tasks/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/:id
 * Delete a task (only if not in_progress)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Check if task exists and get its status
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Prevent deletion of in-progress tasks
    if (existingTask.status === 'in_progress') {
      return NextResponse.json(
        {
          error: 'Cannot delete task that is in progress',
          message:
            'Please cancel or complete the task before deleting, or cancel it first.',
        },
        { status: 400 }
      );
    }

    // Delete the task (cascades to dependencies due to ON DELETE CASCADE)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { error: 'Failed to delete task', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

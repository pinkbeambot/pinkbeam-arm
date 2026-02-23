import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

// Validation schema for creating a dependency
const createDependencySchema = z.object({
  depends_on_task_id: z.string().uuid(),
  dependency_type: z.enum(['blocks', 'requires', 'optional']).default('blocks'),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/tasks/:id/dependencies
 * Get all dependencies for a task
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Check if task exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch dependencies (tasks this task depends on)
    const { data: dependencies, error: depsError } = await supabase
      .from('task_dependencies')
      .select(
        `
        id,
        dependency_type,
        depends_on_task_id,
        created_at,
        depends_on:depends_on_task_id(id, title, status, priority, assignee_id)
      `
      )
      .eq('task_id', id)
      .eq('tenant_id', tenantId);

    if (depsError) {
      console.error('Failed to fetch dependencies:', depsError);
      return NextResponse.json(
        { error: 'Failed to fetch dependencies' },
        { status: 500 }
      );
    }

    // Fetch dependents (tasks that depend on this task)
    const { data: dependents, error: dependentsError } = await supabase
      .from('task_dependencies')
      .select(
        `
        id,
        dependency_type,
        task_id,
        created_at,
        dependent_task:task_id(id, title, status, priority, assignee_id)
      `
      )
      .eq('depends_on_task_id', id)
      .eq('tenant_id', tenantId);

    if (dependentsError) {
      console.error('Failed to fetch dependents:', dependentsError);
      return NextResponse.json(
        { error: 'Failed to fetch dependents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        task_id: id,
        dependencies: dependencies || [],
        dependents: dependents || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/:id/dependencies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/:id/dependencies
 * Add a dependency to a task
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createDependencySchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Prevent self-dependency
    if (id === validatedData.depends_on_task_id) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    // Check if task exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if dependency task exists and belongs to tenant
    const { data: dependsOnTask, error: dependsError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', validatedData.depends_on_task_id)
      .eq('tenant_id', tenantId)
      .single();

    if (dependsError || !dependsOnTask) {
      return NextResponse.json(
        { error: 'Dependency task not found' },
        { status: 404 }
      );
    }

    // Check for circular dependencies
    const { data: circularCheck, error: circularError } = await supabase.rpc(
      'check_circular_dependency',
      {
        p_task_id: id,
        p_depends_on_task_id: validatedData.depends_on_task_id,
      }
    );

    if (circularError) {
      console.error('Error checking circular dependency:', circularError);
      // Continue anyway, the database unique constraint will catch duplicates
    } else if (circularCheck === true) {
      return NextResponse.json(
        { error: 'Circular dependency detected' },
        { status: 400 }
      );
    }

    // Create the dependency
    const { data: dependency, error } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: id,
        depends_on_task_id: validatedData.depends_on_task_id,
        dependency_type: validatedData.dependency_type,
        tenant_id: tenantId,
      })
      .select(
        `
        *,
        depends_on:depends_on_task_id(id, title, status, priority)
      `
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique violation
        return NextResponse.json(
          { error: 'Dependency already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating dependency:', error);
      return NextResponse.json(
        { error: 'Failed to create dependency' },
        { status: 500 }
      );
    }

    // If the dependency is blocking and the depends_on task is not completed,
    // update the task status to blocked
    if (
      validatedData.dependency_type === 'blocks' &&
      dependsOnTask.status !== 'completed'
    ) {
      await supabase
        .from('tasks')
        .update({ status: 'blocked' })
        .eq('id', id)
        .eq('tenant_id', tenantId);
    }

    return NextResponse.json({ data: dependency }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/tasks/:id/dependencies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/:id/dependencies
 * Remove a dependency from a task
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the dependency ID from query params
    const { searchParams } = new URL(request.url);
    const dependencyId = searchParams.get('dependency_id');
    const dependsOnTaskId = searchParams.get('depends_on_task_id');

    if (!dependencyId && !dependsOnTaskId) {
      return NextResponse.json(
        { error: 'Either dependency_id or depends_on_task_id is required' },
        { status: 400 }
      );
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Build the delete query
    let deleteQuery = supabase
      .from('task_dependencies')
      .delete()
      .eq('task_id', id)
      .eq('tenant_id', tenantId);

    if (dependencyId) {
      deleteQuery = deleteQuery.eq('id', dependencyId);
    } else if (dependsOnTaskId) {
      deleteQuery = deleteQuery.eq('depends_on_task_id', dependsOnTaskId);
    }

    const { error, count } = await deleteQuery;

    if (error) {
      console.error('Error deleting dependency:', error);
      return NextResponse.json(
        { error: 'Failed to delete dependency' },
        { status: 500 }
      );
    }

    // Check if task can be unblocked
    const { data: remainingDeps } = await supabase
      .from('task_dependencies')
      .select('id')
      .eq('task_id', id)
      .eq('dependency_type', 'blocks')
      .eq('tenant_id', tenantId);

    if (!remainingDeps || remainingDeps.length === 0) {
      // No more blocking dependencies, unblock the task
      await supabase
        .from('tasks')
        .update({ status: 'queued' })
        .eq('id', id)
        .eq('status', 'blocked')
        .eq('tenant_id', tenantId);
    }

    return NextResponse.json({
      message: 'Dependency removed successfully',
      count: count || 1,
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/:id/dependencies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

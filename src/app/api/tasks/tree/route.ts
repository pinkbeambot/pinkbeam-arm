import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { taskTreeQuerySchema } from '@/lib/validation';
import { z } from 'zod';

interface TaskNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  depth: number;
  assignee_id: string | null;
  assignee?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  progress_percent: number;
  deadline_at: string | null;
  created_at: string;
  children: TaskNode[];
}

/**
 * GET /api/tasks/tree
 * Get a task tree with all descendants
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      root_id: searchParams.get('root_id') || '',
      max_depth: searchParams.get('max_depth') || '10',
      include_completed: searchParams.get('include_completed') !== 'false',
    };

    // Validate query parameters
    const validatedQuery = taskTreeQuerySchema.parse(queryParams);
    const { root_id, max_depth, include_completed } = validatedQuery;

    // First, verify the root task exists and belongs to tenant
    const { data: rootTask, error: rootError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        depth,
        assignee_id,
        progress_percent,
        deadline_at,
        created_at,
        assignee:assignee_id(id, name, avatar_url)
      `)
      .eq('id', root_id)
      .eq('tenant_id', tenantId)
      .single();

    if (rootError) {
      if (rootError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Root task not found' }, { status: 404 });
      }
      console.error('Error fetching root task:', rootError);
      return NextResponse.json(
        { error: 'Failed to fetch root task' },
        { status: 500 }
      );
    }

    // Build the tree using a recursive CTE (Common Table Expression) via the database function
    // Or fetch all descendants and build tree in memory

    // Get all descendants up to max_depth
    const descendantsQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        depth,
        parent_task_id,
        assignee_id,
        progress_percent,
        deadline_at,
        created_at,
        assignee:assignee_id(id, name, avatar_url)
      `)
      .eq('tenant_id', tenantId);

    // Filter by root - get task and all descendants
    // We need to find the path from root to all descendants
    // Using the get_task_chain database function if available, otherwise fetch all and filter

    // Strategy: Get all tasks where the path includes the root
    // Since we have parent_task_id and depth, we can query for tasks with depth > root.depth
    // and then build the tree structure

    // First get the root's depth
    const rootDepth = rootTask.depth || 0;

    // Fetch potential descendants (this is a simplified approach - fetches all tasks in tenant)
    // In production, you'd want a proper tree query using ltree or recursive CTE
    const { data: allTasks, error: tasksError } = await descendantsQuery;

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch task tree' },
        { status: 500 }
      );
    }

    // Filter to only include tasks that are descendants of the root
    // Build a map of all tasks for quick lookup
    const taskMap = new Map(allTasks?.map(t => [t.id, t]) || []);

    // Helper to check if a task is a descendant of the root
    function isDescendantOf(taskId: string, ancestorId: string): boolean {
      const task = taskMap.get(taskId);
      if (!task) return false;
      if (task.parent_task_id === ancestorId) return true;
      if (!task.parent_task_id) return false;
      return isDescendantOf(task.parent_task_id, ancestorId);
    }

    // Filter tasks to only include root and its descendants
    const descendantTasks = (allTasks || []).filter(t =>
      t.id === root_id || isDescendantOf(t.id, root_id)
    );

    // Filter out completed tasks if not included
    const filteredTasks = include_completed
      ? descendantTasks
      : descendantTasks.filter(t => t.status !== 'completed');

    // Helper to extract single assignee from array response
    function extractAssignee(assigneeData: unknown): TaskNode['assignee'] {
      if (Array.isArray(assigneeData) && assigneeData.length > 0) {
        return assigneeData[0] as TaskNode['assignee'];
      }
      return undefined;
    }

    // Build tree structure
    function buildTree(parentId: string | null, currentDepth: number): TaskNode[] {
      if (currentDepth > max_depth) return [];

      const children = filteredTasks.filter(t => t.parent_task_id === parentId);

      return children.map(child => ({
        id: child.id,
        title: child.title,
        status: child.status,
        priority: child.priority,
        depth: child.depth,
        assignee_id: child.assignee_id,
        assignee: extractAssignee(child.assignee),
        progress_percent: child.progress_percent || 0,
        deadline_at: child.deadline_at,
        created_at: child.created_at,
        children: buildTree(child.id, currentDepth + 1),
      }));
    }

    // Build the tree starting from the root
    const tree: TaskNode = {
      id: rootTask.id,
      title: rootTask.title,
      status: rootTask.status,
      priority: rootTask.priority,
      depth: rootTask.depth,
      assignee_id: rootTask.assignee_id,
      assignee: extractAssignee(rootTask.assignee),
      progress_percent: rootTask.progress_percent || 0,
      deadline_at: rootTask.deadline_at,
      created_at: rootTask.created_at,
      children: buildTree(root_id, 1),
    };

    // Calculate tree statistics
    const allNodes: TaskNode[] = [];
    function collectNodes(node: TaskNode) {
      allNodes.push(node);
      node.children.forEach(collectNodes);
    }
    collectNodes(tree);

    const stats = {
      total_tasks: allNodes.length,
      completed_tasks: allNodes.filter(n => n.status === 'completed').length,
      in_progress_tasks: allNodes.filter(n => n.status === 'in_progress').length,
      blocked_tasks: allNodes.filter(n => n.status === 'blocked').length,
      max_depth_reached: Math.max(...allNodes.map(n => n.depth)) - rootDepth,
      completion_percentage: allNodes.length > 0
        ? Math.round((allNodes.filter(n => n.status === 'completed').length / allNodes.length) * 100)
        : 0,
    };

    return NextResponse.json({
      data: tree,
      meta: {
        root_id,
        root_depth: rootDepth,
        max_depth,
        include_completed,
        stats,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/tasks/tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

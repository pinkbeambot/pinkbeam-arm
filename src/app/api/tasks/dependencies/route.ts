import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';

/**
 * GET /api/tasks/dependencies
 * Get all task dependencies for the current tenant
 * Used by the dependency graph view
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { data: dependencies, error } = await supabase
      .from('task_dependencies')
      .select('id, task_id, depends_on_task_id, dependency_type, created_at')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching all dependencies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dependencies' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: dependencies || [] });
  } catch (error) {
    console.error('Error in GET /api/tasks/dependencies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

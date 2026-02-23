import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';

export interface DashboardStats {
  activeAgents: number;
  tasksCompletedToday: number;
  pendingEscalations: number;
  avgResponseTime: string | null;
}

/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns dashboard stats including active agents, tasks completed today, and pending escalations
 *     tags:
 *       - Dashboard
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeAgents:
 *                   type: integer
 *                 tasksCompletedToday:
 *                   type: integer
 *                 pendingEscalations:
 *                   type: integer
 *                 avgResponseTime:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Get current time bounds for "today"
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // Fetch all stats in parallel
    const [
      { count: activeAgentsCount, error: agentsError },
      { count: tasksCount, error: tasksError },
      { count: escalationsCount, error: escalationsError },
    ] = await Promise.all([
      // Active agents (status = active, idle, or initializing)
      supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'idle', 'initializing']),

      // Tasks completed today
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('updated_at', startOfDay)
        .lt('updated_at', endOfDay),

      // Pending escalations (status = open or in_progress)
      supabase
        .from('escalations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['open', 'in_progress']),
    ]);

    // Check for errors
    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return apiError('Failed to fetch agent stats', 500);
    }
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return apiError('Failed to fetch task stats', 500);
    }
    if (escalationsError) {
      console.error('Error fetching escalations:', escalationsError);
      return apiError('Failed to fetch escalation stats', 500);
    }

    const stats: DashboardStats = {
      activeAgents: activeAgentsCount || 0,
      tasksCompletedToday: tasksCount || 0,
      pendingEscalations: escalationsCount || 0,
      avgResponseTime: null, // Will be implemented when we have metrics data
    };

    return apiSuccess(stats);
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return apiError('Internal server error', 500);
  }
}

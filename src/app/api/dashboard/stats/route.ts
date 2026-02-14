import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    // Get current user
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
    const { data: contextSet, error: contextError } = await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    if (contextError || contextSet !== true) {
      console.error('Failed to set tenant context:', contextError);
      return NextResponse.json(
        { error: 'Failed to set tenant context' },
        { status: 500 }
      );
    }

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
        .in('status', ['active', 'idle', 'initializing']),
      
      // Tasks completed today
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', startOfDay)
        .lt('updated_at', endOfDay),
      
      // Pending escalations (status = open or in_progress)
      supabase
        .from('escalations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']),
    ]);

    // Check for errors
    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return NextResponse.json(
        { error: 'Failed to fetch agent stats' },
        { status: 500 }
      );
    }
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch task stats' },
        { status: 500 }
      );
    }
    if (escalationsError) {
      console.error('Error fetching escalations:', escalationsError);
      return NextResponse.json(
        { error: 'Failed to fetch escalation stats' },
        { status: 500 }
      );
    }

    const stats: DashboardStats = {
      activeAgents: activeAgentsCount || 0,
      tasksCompletedToday: tasksCount || 0,
      pendingEscalations: escalationsCount || 0,
      avgResponseTime: null, // Will be implemented when we have metrics data
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

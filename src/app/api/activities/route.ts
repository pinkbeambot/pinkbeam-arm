import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { listActivitiesQuerySchema } from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/activities
 * List activities with filtering, pagination, and related entities
 * 
 * Query Parameters:
 * - agent_id: Filter by agent UUID
 * - entity_type: Filter by target type (task, decision, escalation, agent)
 * - action_type: Filter by activity type (agent.spawned, task.created, etc.)
 * - time_range: Filter by time (1h, 24h, 7d, 30d, all)
 * - date_from: ISO date string for start date
 * - date_to: ISO date string for end date
 * - search: Search in title and description
 * - cursor: Pagination cursor (sequence_number)
 * - limit: Items per page (default 50, max 100)
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
    
    // Parse and validate query parameters
    const queryParams = {
      agent_id: searchParams.get('agent_id') || undefined,
      entity_type: searchParams.get('entity_type') || searchParams.get('category') || undefined,
      action_type: searchParams.get('action_type') || searchParams.get('type') || undefined,
      time_range: searchParams.get('time_range') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      search: searchParams.get('search') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || '50',
    };

    // Validate query parameters
    const validatedQuery = listActivitiesQuerySchema.parse(queryParams);
    const limit = Math.min(validatedQuery.limit, 100);
    const cursor = validatedQuery.cursor ? parseInt(validatedQuery.cursor, 10) : null;

    // Build the base query with related entities
    let dbQuery = supabase
      .from('activities')
      .select(
        `
        *,
        agent:agent_id(id, name, avatar_url, role, status),
        task:task_id(id, title, status, priority),
        actor_details:actor_id(id, name, avatar_url, role)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('sequence_number', { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine hasMore

    // Apply cursor-based pagination
    if (cursor) {
      dbQuery = dbQuery.lt('sequence_number', cursor);
    }

    // Apply filters
    if (validatedQuery.agent_id) {
      dbQuery = dbQuery.eq('agent_id', validatedQuery.agent_id);
    }

    // Entity type filter (maps to target_type or category)
    if (validatedQuery.entity_type) {
      const entityTypeMap: Record<string, string> = {
        'tasks': 'task',
        'decisions': 'decision',
        'escalations': 'escalation',
        'agents': 'agent',
        'system': 'system',
      };
      const mappedType = entityTypeMap[validatedQuery.entity_type] || validatedQuery.entity_type;
      
      // Filter by category or target_type
      if (mappedType === 'task' || mappedType === 'decision' || mappedType === 'escalation' || mappedType === 'agent') {
        dbQuery = dbQuery.or(`category.eq.${mappedType},target_type.eq.${mappedType}s`);
      } else {
        dbQuery = dbQuery.eq('category', mappedType);
      }
    }

    // Action type filter
    if (validatedQuery.action_type) {
      dbQuery = dbQuery.eq('type', validatedQuery.action_type);
    }

    // Time range filter
    if (validatedQuery.time_range) {
      const now = new Date();
      let fromDate: Date;
      
      switch (validatedQuery.time_range) {
        case '1h':
          fromDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          fromDate = new Date(0); // All time
      }
      
      if (validatedQuery.time_range !== 'all') {
        dbQuery = dbQuery.gte('created_at', fromDate.toISOString());
      }
    }

    // Date range filters (overrides time_range if specified)
    if (validatedQuery.date_from) {
      dbQuery = dbQuery.gte('created_at', validatedQuery.date_from);
    }
    if (validatedQuery.date_to) {
      dbQuery = dbQuery.lte('created_at', validatedQuery.date_to);
    }

    // Search filter
    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.trim();
      if (searchTerm.length > 0) {
        dbQuery = dbQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
    }

    // Execute query
    const { data: activities, error, count } = await dbQuery;

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: error.message },
        { status: 500 }
      );
    }

    // Determine pagination
    const hasMore = activities && activities.length > limit;
    const slicedActivities = hasMore ? activities.slice(0, limit) : (activities || []);
    
    // Get the next cursor
    const nextCursor = hasMore && slicedActivities.length > 0
      ? String(slicedActivities[slicedActivities.length - 1].sequence_number)
      : undefined;

    // Fetch related agents for the activities (for actor details)
    const agentIds = [...new Set(slicedActivities
      .filter(a => a.actor_type === 'agent')
      .map(a => a.actor_id)
    )];

    let agents: Record<string, unknown>[] = [];
    if (agentIds.length > 0) {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, name, avatar_url, role, status')
        .in('id', agentIds);
      agents = agentData || [];
    }

    // Fetch related tasks if needed
    const taskIds = slicedActivities
      .filter(a => a.target_type === 'tasks' && a.target_id)
      .map(a => a.target_id);
    
    let tasks: Record<string, unknown>[] = [];
    if (taskIds.length > 0) {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, status, priority, assignee_id')
        .in('id', taskIds);
      tasks = taskData || [];
    }

    // Fetch related decisions if needed
    const decisionIds = slicedActivities
      .filter(a => a.target_type === 'decisions' && a.target_id)
      .map(a => a.target_id);
    
    let decisions: Record<string, unknown>[] = [];
    if (decisionIds.length > 0) {
      const { data: decisionData } = await supabase
        .from('decisions')
        .select('id, title, status, category, agent_id')
        .in('id', decisionIds);
      decisions = decisionData || [];
    }

    // Fetch related escalations if needed
    const escalationIds = slicedActivities
      .filter(a => a.target_type === 'escalations' && a.target_id)
      .map(a => a.target_id);
    
    let escalations: Record<string, unknown>[] = [];
    if (escalationIds.length > 0) {
      const { data: escalationData } = await supabase
        .from('escalations')
        .select('id, title, status, urgency, agent_id')
        .in('id', escalationIds);
      escalations = escalationData || [];
    }

    // Format response
    return NextResponse.json({
      activities: slicedActivities,
      agents,
      tasks: tasks.length > 0 ? tasks : undefined,
      decisions: decisions.length > 0 ? decisions : undefined,
      escalations: escalations.length > 0 ? escalations : undefined,
      meta: {
        total: count || 0,
        cursor: nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

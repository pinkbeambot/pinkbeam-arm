import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Query parameter validation schema
const activitiesQuerySchema = z.object({
  type: z.string().optional(),
  agent_id: z.string().uuid().optional(),
  category: z.enum(['agent', 'task', 'decision', 'escalation', 'system', 'message']).optional(),
  actor_type: z.enum(['agent', 'user', 'system']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type ActivitiesQueryParams = z.infer<typeof activitiesQuerySchema>;

/**
 * GET /api/activities
 * 
 * Fetch activities with optional filters:
 * - type: Filter by activity type (e.g., 'task.created', 'agent.spawned')
 * - agent_id: Filter by specific agent
 * - category: Filter by category ('agent', 'task', 'decision', 'escalation', 'system', 'message')
 * - actor_type: Filter by actor type ('agent', 'user', 'system')
 * - from: Start date (ISO 8601)
 * - to: End date (ISO 8601)
 * - search: Search in title and description
 * - limit: Number of results (1-100, default 20)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = activitiesQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      type,
      agent_id,
      category,
      actor_type,
      from,
      to,
      search,
      limit,
      offset,
    } = validationResult.data;

    // Build the query with joined agent data
    let query = supabase
      .from('activities')
      .select(
        '*, agents!left(id, name, avatar_url, role, status)',
        { count: 'exact' }
      );

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (actor_type) {
      query = query.eq('actor_type', actor_type);
    }

    if (from) {
      query = query.gte('created_at', from);
    }

    if (to) {
      query = query.lte('created_at', to);
    }

    // Full-text search on title and description
    if (search) {
      // Use ilike for case-insensitive search on title and description
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Activities GET error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch activities',
          code: 'FETCH_FAILED',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return NextResponse.json({
      data: data || [],
      pagination: {
        total,
        limit,
        offset,
        currentPage,
        totalPages,
        hasMore: offset + limit < total,
      },
    });
  } catch (err) {
    console.error('Activities GET exception:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// Schema for creating activities (for manual activity logging)
const createActivitySchema = z.object({
  type: z.string().min(1).max(100),
  category: z.enum(['agent', 'task', 'decision', 'escalation', 'system', 'message']),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  agent_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  actor_type: z.enum(['agent', 'user', 'system']).default('system'),
  actor_id: z.string().uuid().optional(),
  target_type: z.enum(['task', 'decision', 'escalation', 'agent', 'message']).optional(),
  target_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

/**
 * POST /api/activities
 * 
 * Create a new activity entry (for manual logging).
 * Most activities are auto-generated via database triggers.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // Validate request body
    const validationResult = createActivitySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const activityData = validationResult.data;

    // Insert the activity
    const { data, error } = await supabase
      .from('activities')
      .insert(activityData)
      .select()
      .single();

    if (error) {
      console.error('Activities POST error:', error);
      return NextResponse.json(
        {
          error: 'Failed to create activity',
          code: 'CREATE_FAILED',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Activities POST exception:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

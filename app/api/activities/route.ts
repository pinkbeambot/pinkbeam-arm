import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listActivitiesQuerySchema } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export type ActivitiesQueryParams = z.infer<typeof listActivitiesQuerySchema>;

/**
 * GET /api/activities
 * 
 * Fetch activities with optional filters:
 * - agent_id: Filter by specific agent (actor or related agent)
 * - entity_type: Filter by category ('all', 'tasks', 'decisions', 'escalations', 'agents', 'system')
 * - action_type: Filter by specific action type (e.g., 'task.created', 'agent.spawned')
 * - time_range: Time shortcut ('1h', '24h', '7d', '30d', 'all')
 * - date_from/date_to: Explicit date range (ISO 8601)
 * - search: Search in title and description
 * - cursor: Cursor-based pagination (sequence_number)
 * - limit: Number of results (1-100, default 50)
 * 
 * Response format:
 * {
 *   data: [activity records],
 *   pagination: {
 *     has_more: boolean,
 *     next_cursor: string | null
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Convert URLSearchParams to object
    const queryParams: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Validate query parameters using the schema from validation.ts
    const validationResult = listActivitiesQuerySchema.safeParse(queryParams);

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
      agent_id,
      entity_type,
      action_type,
      time_range,
      date_from,
      date_to,
      search,
      cursor,
      limit,
      // Legacy params for backward compatibility
      type: legacyType,
      category: legacyCategory,
    } = validationResult.data;

    // Build the query with joined agent data
    let query = supabase
      .from('activities')
      .select(
        '*, agents!left(id, name, avatar_url, role, status)',
        { count: 'exact' }
      );

    // Apply filters
    
    // Filter by action_type (new) or legacy type
    const effectiveType = action_type || legacyType;
    if (effectiveType) {
      query = query.eq('type', effectiveType);
    }

    // Filter by agent_id (actor or related agent)
    if (agent_id) {
      query = query.or(`agent_id.eq.${agent_id},actor_id.eq.${agent_id}`);
    }

    // Filter by entity_type (new) or legacy category
    const effectiveCategory = entity_type && entity_type !== 'all' 
      ? entity_type.replace(/s$/, '') // Remove trailing 's' for singular form
      : legacyCategory;
    if (effectiveCategory) {
      query = query.eq('category', effectiveCategory);
    }

    // Apply time range filters
    const now = new Date();
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (time_range && time_range !== 'all') {
      fromDate = new Date();
      switch (time_range) {
        case '1h':
          fromDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          fromDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          fromDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          fromDate.setDate(now.getDate() - 30);
          break;
      }
    } else if (date_from) {
      fromDate = new Date(date_from);
    }

    if (date_to) {
      toDate = new Date(date_to);
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate.toISOString());
    }

    if (toDate) {
      query = query.lte('created_at', toDate.toISOString());
    }

    // Full-text search on title and description
    if (search) {
      // Use ilike for case-insensitive search on title and description
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply cursor-based pagination
    if (cursor) {
      const cursorNum = parseInt(cursor, 10);
      if (!isNaN(cursorNum)) {
        query = query.lt('sequence_number', cursorNum);
      }
    }

    // Execute query with cursor-based pagination ordering
    // Order by sequence_number DESC for consistent cursor pagination
    const { data, error, count } = await query
      .order('sequence_number', { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine has_more

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

    // Process results for cursor-based pagination
    const hasMore = data && data.length > limit;
    const activities = hasMore ? data.slice(0, limit) : (data || []);
    
    // Determine next cursor
    let nextCursor: string | null = null;
    if (hasMore && activities.length > 0) {
      const lastActivity = activities[activities.length - 1];
      if (lastActivity?.sequence_number) {
        nextCursor = String(lastActivity.sequence_number);
      }
    }

    return NextResponse.json({
      data: activities,
      pagination: {
        has_more: hasMore,
        next_cursor: nextCursor,
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

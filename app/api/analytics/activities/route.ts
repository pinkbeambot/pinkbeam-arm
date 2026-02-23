import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { z } from 'zod';

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  agentIds: z.string().optional(),
  categories: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const VALID_CATEGORIES = ['agent', 'task', 'decision', 'escalation', 'system', 'message'];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);
    
    const validationResult = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { from, to, agentIds, categories, limit, offset } = validationResult.data;
    
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;

    const agentIdList = agentIds ? agentIds.split(',').filter(Boolean) : [];
    const categoryList = categories 
      ? categories.split(',').filter(c => VALID_CATEGORIES.includes(c)) 
      : [];

    let query = supabase
      .from('activities')
      .select('*, agents!left(id, name, avatar_url)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (agentIdList.length > 0) {
      query = query.in('agent_id', agentIdList);
    }

    if (categoryList.length > 0) {
      query = query.in('category', categoryList);
    }

    const { data: activities, error: activitiesError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activitiesError) {
      console.error('Activity analytics fetch error:', activitiesError);
      return apiError('Failed to fetch activity data', 500, activitiesError.message);
    }

    const summaryQuery = supabase
      .from('activities')
      .select('type, category')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (agentIdList.length > 0) {
      summaryQuery.in('agent_id', agentIdList);
    }

    if (categoryList.length > 0) {
      summaryQuery.in('category', categoryList);
    }

    const { data: summaryActivities, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.error('Activity summary fetch error:', summaryError);
      return apiError('Failed to fetch activity summary', 500, summaryError.message);
    }

    const eventsByType: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};

    (summaryActivities || []).forEach(activity => {
      eventsByType[activity.type] = (eventsByType[activity.type] || 0) + 1;
      eventsByCategory[activity.category] = (eventsByCategory[activity.category] || 0) + 1;
    });

    const timelineItems = (activities || []).map(activity => ({
      id: activity.id,
      type: activity.type,
      category: activity.category,
      title: activity.title,
      description: activity.description,
      timestamp: activity.created_at,
      agentId: activity.agent_id,
      agentName: activity.agents?.name,
      taskId: activity.related_task_id || activity.task_id,
      decisionId: activity.related_decision_id,
      escalationId: activity.related_escalation_id,
      metadata: activity.metadata,
    }));

    return apiSuccess({
      activities: timelineItems,
      summary: {
        totalEvents: count || 0,
        eventsByType,
        eventsByCategory,
      },
    });
  } catch (err) {
    console.error('Activity analytics exception:', err);
    return apiError('Internal server error', 500);
  }
}

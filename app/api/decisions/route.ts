/**
 * GET /api/decisions
 * 
 * List decisions with filtering, pagination, and advanced search.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import { advancedDecisionsQuerySchema } from '@/lib/validation';
import { applyFullTextSearch, parseFilters, applyFilters } from '@/lib/api/filtering';
import type { Database } from '@/lib/database';

type Decision = Database['public']['Tables']['decisions']['Row'];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    const validationResult = advancedDecisionsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const params = validationResult.data;
    const offset = (params.page - 1) * params.limit;

    let query = supabase.from('decisions').select('*', { count: 'exact' });
    query = query.eq('tenant_id', tenantId);

    if (params.status) query = query.eq('status', params.status);
    if (params.category) query = query.eq('category', params.category);
    if (params.agent_id) query = query.eq('agent_id', params.agent_id);
    if (params.task_id) query = query.eq('task_id', params.task_id);
    if (params.self_authorized !== undefined) query = query.eq('self_authorized', params.self_authorized);
    if (params.created_after) query = query.gte('created_at', params.created_after);
    if (params.created_before) query = query.lte('created_at', params.created_before);

    if (params.q) {
      const searchFields = params.search_fields?.split(',').filter(Boolean) || ['title', 'description'];
      const searchOperator = ('search_operator' in params ? params.search_operator : 'and') as 'and' | 'or';
      query = applyFullTextSearch(query, params.q, searchFields, searchOperator || 'and');
    }

    if (params.filters) {
      const filterConditions = parseFilters(params.filters);
      query = applyFilters(query, filterConditions);
    }

    const sortColumn = params.sort_by === 'confidence' ? 'confidence' : params.sort_by === 'proposed_at' ? 'proposed_at' : params.sort_by === 'decided_at' ? 'decided_at' : 'created_at';
    query = query.order(sortColumn, { ascending: params.sort_order === 'asc' });

    const { data, error, count } = await query.range(offset, offset + params.limit - 1);

    if (error) {
      return apiError('Failed to fetch decisions', 500, error.message);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / params.limit);

    return apiSuccessList(data || [], {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    }, {
      filters: {
        status: params.status,
        category: params.category,
        agent_id: params.agent_id,
        task_id: params.task_id,
        self_authorized: params.self_authorized,
        q: params.q,
      },
      sort: { by: params.sort_by, order: params.sort_order },
    });
  } catch (err) {
    return apiError('Internal server error', 500);
  }
}

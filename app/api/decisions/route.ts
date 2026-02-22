/**
 * Decisions API Route
 * 
 * GET  /api/decisions - List decisions with filters
 * GET  /api/decisions/:id - Get a specific decision
 * 
 * Features:
 * - Filtering by status, category, agent, task
 * - Pagination with page/limit
 * - Sorting by created_at, proposed_at, decided_at, confidence
 * - Full-text search on title/description
 * - Advanced filter conditions
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiSuccessList, apiError } from '@/lib/api/response';
import { advancedDecisionsQuerySchema } from '@/lib/validation';
import { applyFullTextSearch, parseFilters, applyFilters } from '@/lib/api/filtering';
import type { Database } from '@/lib/database';

type Decision = Database['public']['Tables']['decisions']['Row'];

/**
 * GET /api/decisions
 * 
 * List all decisions for the current tenant with filtering and pagination.
 * 
 * Query Parameters:
 * - status: Filter by status (proposed, approved, rejected, overridden, executed)
 * - category: Filter by category (action, resource, escalation, strategy, system)
 * - agent_id: Filter by proposing agent ID
 * - task_id: Filter by related task ID
 * - self_authorized: Filter by self-authorized flag (true/false)
 * - q: Full-text search query
 * - search_fields: Comma-separated fields to search (default: title,description)
 * - sort_by: Sort field (created_at, proposed_at, decided_at, confidence)
 * - sort_order: Sort direction (asc, desc)
 * - created_after: Filter decisions created after this date
 * - created_before: Filter decisions created before this date
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - filters: JSON array of advanced filter conditions
 * 
 * Response: { data: Decision[], pagination: {...}, meta?: {...} }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = advancedDecisionsQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const params = validationResult.data;

    // Calculate offset from page
    const offset = (params.page - 1) * params.limit;

    // Build the query with count
    let query = supabase
      .from('decisions')
      .select('*', { count: 'exact' });

    // Apply tenant filter
    query = query.eq('tenant_id', tenantId);

    // Apply filters
    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.agent_id) {
      query = query.eq('agent_id', params.agent_id);
    }

    if (params.task_id) {
      query = query.eq('task_id', params.task_id);
    }

    if (params.self_authorized !== undefined) {
      query = query.eq('self_authorized', params.self_authorized);
    }

    // Date range filters
    if (params.created_after) {
      query = query.gte('created_at', params.created_after);
    }
    if (params.created_before) {
      query = query.lte('created_at', params.created_before);
    }

    // Full-text search
    if (params.q) {
      const searchFields = params.search_fields?.split(',').filter(Boolean) || ['title', 'description'];
      query = applyFullTextSearch(query, params.q, searchFields, params.search_operator || 'and');
    }

    // Apply advanced filter conditions
    if (params.filters) {
      const filterConditions = parseFilters(params.filters);
      query = applyFilters(query, filterConditions);
    }

    // Apply sorting
    const sortColumn = params.sort_by === 'confidence' 
      ? 'confidence' 
      : params.sort_by === 'proposed_at' 
        ? 'proposed_at' 
        : params.sort_by === 'decided_at' 
          ? 'decided_at' 
          : 'created_at';
    
    query = query.order(sortColumn, { ascending: params.sort_order === 'asc' });

    // Execute query with pagination
    const { data, error, count } = await query
      .range(offset, offset + params.limit - 1);

    if (error) {
      console.error('Decisions GET error:', error);
      return apiError('Failed to fetch decisions', 500, error.message);
    }

    // Calculate pagination
    const total = count || 0;
    const totalPages = Math.ceil(total / params.limit);

    // Build response metadata
    const meta = {
      filters: {
        status: params.status,
        category: params.category,
        agent_id: params.agent_id,
        task_id: params.task_id,
        self_authorized: params.self_authorized,
        q: params.q,
        created_after: params.created_after,
        created_before: params.created_before,
      },
      sort: {
        by: params.sort_by,
        order: params.sort_order,
      },
    };

    return apiSuccessList(data || [], {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    }, meta);
  } catch (err) {
    console.error('Decisions GET exception:', err);
    return apiError('Internal server error', 500);
  }
}

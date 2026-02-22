/**
 * GET /api/export/agents
 * 
 * Export agents data in CSV, JSON, or JSONL format.
 * 
 * Query Parameters:
 * - format: 'csv' | 'json' | 'jsonl' (default: 'json')
 * - status: Filter by status
 * - role: Filter by role
 * - parent_id: Filter by parent agent
 * - include_stats: Include agent statistics (default: false)
 * - include_inactive: Include soft-deleted agents (default: false)
 * - date_from: Filter agents created after this date
 * - date_to: Filter agents created before this date
 * - include_metadata: Include export metadata (default: true)
 * 
 * Response: File download or JSON data
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { exportAgentsQuerySchema } from '@/lib/validation';
import { 
  formatForExport, 
  generateExportFilename, 
  getExportContentType,
  sanitizeForExport,
  flattenForCsv,
} from '@/lib/api/export';
import type { Database } from '@/lib/database';

type Agent = Database['public']['Tables']['agents']['Row'];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = exportAgentsQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const {
      format,
      status,
      role,
      parent_id,
      include_stats,
      include_inactive,
      date_from,
      date_to,
      include_metadata,
    } = validationResult.data;

    // Build the query
    let query = supabase
      .from('agents')
      .select(include_stats ? '*, tasks(count)' : '*');

    // Apply tenant filter
    query = query.eq('tenant_id', tenantId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    if (!include_inactive) {
      query = query.is('deleted_at', null);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    // Execute query (no pagination for exports - fetch all)
    const { data: agents, error } = await query;

    if (error) {
      console.error('Agents export error:', error);
      return apiError('Failed to fetch agents', 500, error.message);
    }

    const agentList = (agents || []) as Record<string, unknown>[];

    // Sanitize data for export
    let exportData = sanitizeForExport(agentList, ['session_id']);

    // Flatten JSON fields for CSV
    if (format === 'csv') {
      exportData = flattenForCsv(exportData, ['capabilities', 'config', 'llm_config', 'limits', 'stats']);
    }

    // Format the data
    const formattedData = formatForExport(exportData, format, {
      includeHeaders: true,
    });

    // For CSV and JSONL, return as file download
    if (format === 'csv' || format === 'jsonl') {
      const filename = generateExportFilename('agents', format, tenantId);
      const contentType = getExportContentType(format);

      return new Response(formattedData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // For JSON, return structured response
    return apiSuccess({
      success: true,
      format,
      record_count: exportData.length,
      filename: generateExportFilename('agents', format, tenantId),
      data: include_metadata ? {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        filters: {
          status,
          role,
          parent_id,
          include_stats,
          include_inactive,
          date_from,
          date_to,
        },
        agents: exportData,
      } : exportData,
    });
  } catch (err) {
    console.error('Agents export exception:', err);
    return apiError('Internal server error', 500);
  }
}

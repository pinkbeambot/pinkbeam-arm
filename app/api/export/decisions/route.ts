/**
 * GET /api/export/decisions
 * 
 * Export decisions data in CSV, JSON, or JSONL format.
 * 
 * Query Parameters:
 * - format: 'csv' | 'json' | 'jsonl' (default: 'json')
 * - status: Filter by status
 * - category: Filter by category
 * - agent_id: Filter by proposing agent
 * - include_reasoning: Include decision reasoning (default: true)
 * - include_outcome: Include decision outcome (default: true)
 * - date_from: Filter decisions created after this date
 * - date_to: Filter decisions created before this date
 * - include_metadata: Include export metadata (default: true)
 * 
 * Response: File download or JSON data
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { exportDecisionsQuerySchema } from '@/lib/validation';
import { 
  formatForExport, 
  generateExportFilename, 
  getExportContentType,
  sanitizeForExport,
  flattenForCsv,
} from '@/lib/api/export';
import type { Database } from '@/lib/database';

type Decision = Database['public']['Tables']['decisions']['Row'];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = exportDecisionsQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const {
      format,
      status,
      category,
      agent_id,
      include_reasoning,
      include_outcome,
      date_from,
      date_to,
      include_metadata,
    } = validationResult.data;

    // Build the query
    let query = supabase
      .from('decisions')
      .select('*');

    // Apply tenant filter
    query = query.eq('tenant_id', tenantId);

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply category filter
    if (category) {
      query = query.eq('category', category);
    }

    // Apply agent filter
    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    // Apply date filters
    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    // Execute query (no pagination for exports - fetch all)
    const { data: decisions, error } = await query;

    if (error) {
      console.error('Decisions export error:', error);
      return apiError('Failed to fetch decisions', 500, error.message);
    }

    const decisionList = (decisions || []) as Record<string, unknown>[];

    // Sanitize data for export
    const fieldsToRemove: string[] = [];
    if (!include_reasoning) {
      fieldsToRemove.push('reasoning');
    }
    if (!include_outcome) {
      fieldsToRemove.push('outcome');
      fieldsToRemove.push('executed_action');
    }
    
    let exportData = sanitizeForExport(decisionList, fieldsToRemove);

    // Flatten JSON fields for CSV
    if (format === 'csv') {
      const jsonFields = [];
      if (include_reasoning) jsonFields.push('reasoning');
      if (include_outcome) {
        jsonFields.push('proposed_action', 'executed_action', 'outcome');
      }
      exportData = flattenForCsv(exportData, jsonFields);
    }

    // Format the data
    const formattedData = formatForExport(exportData, format, {
      includeHeaders: true,
    });

    // For CSV and JSONL, return as file download
    if (format === 'csv' || format === 'jsonl') {
      const filename = generateExportFilename('decisions', format, tenantId);
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
      filename: generateExportFilename('decisions', format, tenantId),
      data: include_metadata ? {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        filters: {
          status,
          category,
          agent_id,
          include_reasoning,
          include_outcome,
          date_from,
          date_to,
        },
        decisions: exportData,
      } : exportData,
    });
  } catch (err) {
    console.error('Decisions export exception:', err);
    return apiError('Internal server error', 500);
  }
}

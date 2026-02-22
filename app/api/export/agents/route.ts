/**
 * GET /api/export/agents
 * 
 * Export agents data in CSV, JSON, or JSONL format.
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

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    const validationResult = exportAgentsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { format, status, role, include_inactive, date_from, date_to, include_metadata } = validationResult.data;

    let query = supabase.from('agents').select('*');
    query = query.eq('tenant_id', tenantId);

    if (status) query = query.eq('status', status);
    if (role) query = query.eq('role', role);
    if (!include_inactive) query = query.is('deleted_at', null);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    query = query.order('created_at', { ascending: false });

    const { data: agents, error } = await query;

    if (error) {
      return apiError('Failed to fetch agents', 500, error.message);
    }

    const agentList = (agents || []) as unknown as Record<string, unknown>[];
    let exportData = sanitizeForExport(agentList, ['session_id']);

    if (format === 'csv') {
      exportData = flattenForCsv(exportData, ['capabilities', 'config', 'llm_config', 'limits', 'stats']);
    }

    const formattedData = formatForExport(exportData, format, { includeHeaders: true });

    if (format === 'csv' || format === 'jsonl') {
      const filename = generateExportFilename('agents', format, tenantId);
      return new Response(formattedData, {
        status: 200,
        headers: {
          'Content-Type': getExportContentType(format),
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return apiSuccess({
      success: true,
      format,
      record_count: exportData.length,
      filename: generateExportFilename('agents', format, tenantId),
      data: include_metadata ? {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        filters: { status, role, include_inactive, date_from, date_to },
        agents: exportData,
      } : exportData,
    });
  } catch (err) {
    return apiError('Internal server error', 500);
  }
}

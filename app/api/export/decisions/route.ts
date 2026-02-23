/**
 * GET /api/export/decisions
 * 
 * Export decisions data in CSV, JSON, or JSONL format.
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

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    const validationResult = exportDecisionsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { format, status, category, agent_id, include_reasoning, include_outcome, date_from, date_to, include_metadata } = validationResult.data;

    let query = supabase.from('decisions').select('*');
    query = query.eq('tenant_id', tenantId);

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (agent_id) query = query.eq('agent_id', agent_id);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    query = query.order('created_at', { ascending: false });

    const { data: decisions, error } = await query;

    if (error) {
      return apiError('Failed to fetch decisions', 500, error.message);
    }

    const decisionList = (decisions || []) as unknown as Record<string, unknown>[];
    const fieldsToRemove: string[] = [];
    if (!include_reasoning) fieldsToRemove.push('reasoning');
    if (!include_outcome) {
      fieldsToRemove.push('outcome');
      fieldsToRemove.push('executed_action');
    }
    
    let exportData = sanitizeForExport(decisionList, fieldsToRemove);

    if (format === 'csv') {
      const jsonFields = [];
      if (include_reasoning) jsonFields.push('reasoning');
      if (include_outcome) jsonFields.push('proposed_action', 'executed_action', 'outcome');
      exportData = flattenForCsv(exportData, jsonFields);
    }

    const formattedData = formatForExport(exportData, format, { includeHeaders: true });

    if (format === 'csv' || format === 'jsonl') {
      const filename = generateExportFilename('decisions', format, tenantId);
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
      filename: generateExportFilename('decisions', format, tenantId),
      data: include_metadata ? {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        filters: { status, category, agent_id, include_reasoning, include_outcome, date_from, date_to },
        decisions: exportData,
      } : exportData,
    });
  } catch (err) {
    return apiError('Internal server error', 500);
  }
}

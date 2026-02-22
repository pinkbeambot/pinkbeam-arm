/**
 * GET /api/export/tasks
 * 
 * Export tasks data in CSV, JSON, or JSONL format.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { exportTasksQuerySchema } from '@/lib/validation';
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

    const validationResult = exportTasksQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { format, status, priority, assignee_id, include_outputs, date_from, date_to, include_metadata } = validationResult.data;

    let query = supabase.from('tasks').select('*');
    query = query.eq('tenant_id', tenantId);

    if (status && Array.isArray(status) && status.length > 0) {
      query = status.length === 1 ? query.eq('status', status[0]) : query.in('status', status);
    }
    if (priority) query = query.eq('priority', priority);
    if (assignee_id) query = query.eq('assignee_id', assignee_id);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    query = query.order('created_at', { ascending: false });

    const { data: tasks, error } = await query;

    if (error) {
      return apiError('Failed to fetch tasks', 500, error.message);
    }

    const taskList = (tasks || []) as unknown as Record<string, unknown>[];
    const fieldsToRemove = include_outputs ? [] : ['outputs', 'inputs', 'expected_outputs'];
    let exportData = sanitizeForExport(taskList, fieldsToRemove);

    if (format === 'csv') {
      const jsonFields = include_outputs ? ['inputs', 'expected_outputs', 'outputs'] : [];
      exportData = flattenForCsv(exportData, jsonFields);
    }

    const formattedData = formatForExport(exportData, format, { includeHeaders: true });

    if (format === 'csv' || format === 'jsonl') {
      const filename = generateExportFilename('tasks', format, tenantId);
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
      filename: generateExportFilename('tasks', format, tenantId),
      data: include_metadata ? {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        filters: { status, priority, assignee_id, include_outputs, date_from, date_to },
        tasks: exportData,
      } : exportData,
    });
  } catch (err) {
    return apiError('Internal server error', 500);
  }
}

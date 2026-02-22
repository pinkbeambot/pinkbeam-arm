/**
 * GET /api/export/tasks
 * 
 * Export tasks data in CSV, JSON, or JSONL format.
 * 
 * Query Parameters:
 * - format: 'csv' | 'json' | 'jsonl' (default: 'json')
 * - status: Filter by status (comma-separated for multiple)
 * - priority: Filter by priority
 * - assignee_id: Filter by assigned agent
 * - parent_id: Filter by parent task
 * - include_subtasks: Include subtasks (default: true)
 * - include_outputs: Include task outputs (default: false)
 * - date_from: Filter tasks created after this date
 * - date_to: Filter tasks created before this date
 * - include_metadata: Include export metadata (default: true)
 * 
 * Response: File download or JSON data
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
import type { Database } from '@/lib/database';

type Task = Database['public']['Tables']['tasks']['Row'];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = exportTasksQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const {
      format,
      status,
      priority,
      assignee_id,
      parent_id,
      include_subtasks,
      include_outputs,
      date_from,
      date_to,
      include_metadata,
    } = validationResult.data;

    // Build the query
    let query = supabase
      .from('tasks')
      .select('*');

    // Apply tenant filter
    query = query.eq('tenant_id', tenantId);

    // Apply status filter (supports multiple)
    if (status && Array.isArray(status) && status.length > 0) {
      if (status.length === 1) {
        query = query.eq('status', status[0]);
      } else {
        query = query.in('status', status);
      }
    }

    // Apply priority filter
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Apply assignee filter
    if (assignee_id) {
      query = query.eq('assignee_id', assignee_id);
    }

    // Apply parent filter
    if (!include_subtasks) {
      query = query.is('parent_task_id', null);
    } else if (parent_id !== undefined) {
      query = query.eq('parent_task_id', parent_id);
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
    const { data: tasks, error } = await query;

    if (error) {
      console.error('Tasks export error:', error);
      return apiError('Failed to fetch tasks', 500, error.message);
    }

    const taskList = (tasks || []) as Record<string, unknown>[];

    // Sanitize data for export
    const fieldsToRemove = include_outputs ? [] : ['outputs', 'inputs', 'expected_outputs'];
    let exportData = sanitizeForExport(taskList, fieldsToRemove);

    // Flatten JSON fields for CSV
    if (format === 'csv') {
      const jsonFields = include_outputs 
        ? ['inputs', 'expected_outputs', 'outputs'] 
        : [];
      exportData = flattenForCsv(exportData, jsonFields);
    }

    // Format the data
    const formattedData = formatForExport(exportData, format, {
      includeHeaders: true,
    });

    // For CSV and JSONL, return as file download
    if (format === 'csv' || format === 'jsonl') {
      const filename = generateExportFilename('tasks', format, tenantId);
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
      filename: generateExportFilename('tasks', format, tenantId),
      data: include_metadata ? {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        filters: {
          status,
          priority,
          assignee_id,
          parent_id,
          include_subtasks,
          include_outputs,
          date_from,
          date_to,
        },
        tasks: exportData,
      } : exportData,
    });
  } catch (err) {
    console.error('Tasks export exception:', err);
    return apiError('Internal server error', 500);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';
import { escapeIlike } from '@/lib/utils';

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  entity_type: z.enum(['all', 'tasks', 'decisions', 'escalations', 'agents', 'system']).optional(),
  action_type: z.string().optional(),
  time_range: z.enum(['1h', '24h', '7d', '30d', '90d', 'all']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/, 'Invalid date format').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/, 'Invalid date format').optional(),
  search: z.string().max(200).optional(),
  include_security: z.enum(['true', 'false']).optional(),
});

function getTimeRangeDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    // Require admin+ for audit log export
    const guard = requirePermission(userRole, 'analytics:read');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = exportQuerySchema.parse({
      format: searchParams.get('format') || 'csv',
      entity_type: searchParams.get('entity_type') || undefined,
      action_type: searchParams.get('action_type') || undefined,
      time_range: searchParams.get('time_range') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      search: searchParams.get('search') || undefined,
      include_security: searchParams.get('include_security') || undefined,
    });

    // Build query for activities (max 10000 rows for export)
    let dbQuery = supabase
      .from('activities')
      .select('id, type, category, actor_type, actor_id, target_type, target_id, title, description, metadata, agent_id, task_id, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10000);

    // Apply filters
    if (params.entity_type && params.entity_type !== 'all') {
      const entityTypeMap: Record<string, string> = {
        tasks: 'task', decisions: 'decision', escalations: 'escalation', agents: 'agent', system: 'system',
      };
      const mappedType = entityTypeMap[params.entity_type] || params.entity_type;
      if (['task', 'decision', 'escalation', 'agent'].includes(mappedType)) {
        dbQuery = dbQuery.or(`category.eq.${mappedType},target_type.eq.${mappedType}s`);
      } else {
        dbQuery = dbQuery.eq('category', mappedType);
      }
    }

    if (params.action_type) {
      dbQuery = dbQuery.eq('type', params.action_type);
    }

    if (params.time_range && params.time_range !== 'all') {
      const fromDate = getTimeRangeDate(params.time_range);
      if (fromDate) {
        dbQuery = dbQuery.gte('created_at', fromDate.toISOString());
      }
    }

    if (params.date_from) {
      dbQuery = dbQuery.gte('created_at', params.date_from);
    }
    if (params.date_to) {
      dbQuery = dbQuery.lte('created_at', params.date_to);
    }

    if (params.search) {
      const escaped = escapeIlike(params.search.trim());
      dbQuery = dbQuery.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    const { data: activities, error } = await dbQuery;

    if (error) {
      console.error('Error exporting activities:', error);
      return NextResponse.json({ error: 'Failed to export activities' }, { status: 500 });
    }

    // Optionally include security audit log
    let securityLogs: Record<string, unknown>[] = [];
    if (params.include_security === 'true') {
      let secQuery = supabase
        .from('security_audit_log')
        .select('id, action, resource_type, resource_id, ip_address, user_agent, details, risk_score, risk_factors, success, error_code, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10000);

      if (params.time_range && params.time_range !== 'all') {
        const fromDate = getTimeRangeDate(params.time_range);
        if (fromDate) {
          secQuery = secQuery.gte('created_at', fromDate.toISOString());
        }
      }
      if (params.date_from) {
        secQuery = secQuery.gte('created_at', params.date_from);
      }
      if (params.date_to) {
        secQuery = secQuery.lte('created_at', params.date_to);
      }

      const { data: secData } = await secQuery;
      securityLogs = secData || [];
    }

    const allActivities = activities || [];
    const dateStr = new Date().toISOString().split('T')[0];

    if (params.format === 'json') {
      const exportData = {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        filters: {
          entity_type: params.entity_type || 'all',
          time_range: params.time_range || 'all',
          date_from: params.date_from,
          date_to: params.date_to,
          search: params.search,
        },
        activity_count: allActivities.length,
        activities: allActivities,
        ...(securityLogs.length > 0 && {
          security_log_count: securityLogs.length,
          security_logs: securityLogs,
        }),
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-log-${dateStr}.json"`,
        },
      });
    }

    // CSV format
    const headers = [
      'ID', 'Timestamp', 'Type', 'Category', 'Actor Type', 'Actor ID',
      'Target Type', 'Target ID', 'Title', 'Description', 'Agent ID', 'Task ID', 'Metadata',
    ];

    const escapeCSV = (val: unknown): string => {
      let str = val == null ? '' : String(val);
      // Prevent CSV formula injection: prefix dangerous characters
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes("'")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = allActivities.map((a) => [
      a.id, a.created_at, a.type, a.category, a.actor_type, a.actor_id,
      a.target_type || '', a.target_id || '', a.title, a.description || '',
      a.agent_id || '', a.task_id || '',
      a.metadata ? JSON.stringify(a.metadata) : '',
    ].map(escapeCSV).join(','));

    let csvContent = [headers.join(','), ...rows].join('\n');

    // Append security logs if included
    if (securityLogs.length > 0) {
      csvContent += '\n\n# Security Audit Log\n';
      const secHeaders = [
        'ID', 'Timestamp', 'Action', 'Resource Type', 'Resource ID',
        'IP Address', 'Success', 'Error Code', 'Risk Score', 'Risk Factors', 'Details',
      ];
      const secRows = securityLogs.map((s) => [
        s.id, s.created_at, s.action, s.resource_type, s.resource_id || '',
        s.ip_address || '', s.success, s.error_code || '', s.risk_score || '',
        Array.isArray(s.risk_factors) ? (s.risk_factors as string[]).join('; ') : '',
        s.details ? JSON.stringify(s.details) : '',
      ].map(escapeCSV).join(','));
      csvContent += [secHeaders.join(','), ...secRows].join('\n');
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error in GET /api/activities/export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

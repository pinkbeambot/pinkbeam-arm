import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

const retentionSchema = z.object({
  activity_retention_days: z.number().int().min(7).max(730),
  security_log_retention_days: z.number().int().min(30).max(730),
  auto_archive_enabled: z.boolean(),
  archive_after_days: z.number().int().min(7).max(365),
});

const DEFAULT_RETENTION = {
  activity_retention_days: 90,
  security_log_retention_days: 365,
  auto_archive_enabled: false,
  archive_after_days: 90,
};

/**
 * POST /api/settings/retention/cleanup
 * Trigger manual data cleanup: archive old activities, purge old archives, clean audit logs.
 * Uses the tenant's configured retention settings.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    const guard = requirePermission(userRole, 'team:manage');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Fetch tenant's retention config
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('config')
      .eq('id', tenantId)
      .single();

    if (fetchError) {
      console.error('Error fetching tenant config for cleanup:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch retention settings' }, { status: 500 });
    }

    const config = (tenant?.config as Record<string, unknown>) || {};
    const rawRetention = {
      ...DEFAULT_RETENTION,
      ...(typeof config.retention === 'object' && config.retention ? config.retention : {}),
    };

    // Validate retention config values
    const parsed = retentionSchema.safeParse(rawRetention);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid retention configuration', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const retention = parsed.data;

    const result = {
      archived_count: 0,
      purged_count: 0,
      audit_cleaned_count: 0,
    };
    const errors: string[] = [];

    // 1. Archive old activities if auto-archive is enabled
    if (retention.auto_archive_enabled) {
      const { data: archiveResult, error: archiveError } = await supabase
        .rpc('archive_old_activities', {
          p_tenant_id: tenantId,
          p_days: retention.archive_after_days,
        });

      if (archiveError) {
        console.error('Error archiving activities:', archiveError);
        errors.push('Failed to archive activities');
      } else {
        result.archived_count = archiveResult ?? 0;
      }
    }

    // 2. Purge old archived activities (based on activity retention period)
    const { data: purgeResult, error: purgeError } = await supabase
      .rpc('purge_archived_activities', {
        p_tenant_id: tenantId,
        p_days: retention.activity_retention_days,
      });

    if (purgeError) {
      console.error('Error purging archived activities:', purgeError);
      errors.push('Failed to purge archived activities');
    } else {
      result.purged_count = purgeResult ?? 0;
    }

    // 3. Clean old security audit logs
    const { data: auditResult, error: auditError } = await supabase
      .rpc('cleanup_old_audit_logs', {
        p_tenant_id: tenantId,
        p_days: retention.security_log_retention_days,
      });

    if (auditError) {
      console.error('Error cleaning audit logs:', auditError);
      errors.push('Failed to clean audit logs');
    } else {
      result.audit_cleaned_count = auditResult ?? 0;
    }

    // Return 500 if all operations failed
    if (errors.length === 3 || (errors.length === 2 && !retention.auto_archive_enabled)) {
      return NextResponse.json(
        { error: 'All cleanup operations failed', errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: result,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/settings/retention/cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

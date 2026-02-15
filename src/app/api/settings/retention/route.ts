import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

const retentionSchema = z.object({
  activity_retention_days: z.number().int().min(7).max(730).optional(),
  security_log_retention_days: z.number().int().min(30).max(730).optional(),
  auto_archive_enabled: z.boolean().optional(),
  archive_after_days: z.number().int().min(7).max(365).optional(),
});

export type RetentionConfig = z.infer<typeof retentionSchema>;

const DEFAULT_RETENTION: Required<RetentionConfig> = {
  activity_retention_days: 90,
  security_log_retention_days: 365,
  auto_archive_enabled: false,
  archive_after_days: 90,
};

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    const guard = requirePermission(userRole, 'analytics:read');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('config')
      .eq('id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching retention config:', error);
      return NextResponse.json({ error: 'Failed to fetch retention settings' }, { status: 500 });
    }

    const config = (tenant?.config as Record<string, unknown>) || {};
    const retention = {
      ...DEFAULT_RETENTION,
      ...(config.retention as Record<string, unknown> || {}),
    };

    // Get storage stats
    const [activityCount, securityCount, archivedCount] = await Promise.all([
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('activities_archive').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).then(
        (res) => res,
        () => ({ count: 0 }) // Table may not exist
      ),
    ]);

    return NextResponse.json({
      data: {
        retention,
        stats: {
          activity_count: activityCount.count || 0,
          security_log_count: securityCount.count || 0,
          archived_count: (archivedCount as { count: number | null }).count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/settings/retention:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    // Only admins+ can modify retention settings
    const guard = requirePermission(userRole, 'team:manage');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = retentionSchema.parse(body);

    // Get current config
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('config')
      .eq('id', tenantId)
      .single();

    if (fetchError) {
      console.error('Error fetching tenant config:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch tenant config' }, { status: 500 });
    }

    const currentConfig = (tenant?.config as Record<string, unknown>) || {};
    const currentRetention = (currentConfig.retention as Record<string, unknown>) || {};

    const updatedConfig = {
      ...currentConfig,
      retention: {
        ...DEFAULT_RETENTION,
        ...currentRetention,
        ...validatedData,
      },
    };

    const { error: updateError } = await supabase
      .from('tenants')
      .update({ config: updatedConfig })
      .eq('id', tenantId);

    if (updateError) {
      console.error('Error updating retention config:', updateError);
      return NextResponse.json({ error: 'Failed to update retention settings' }, { status: 500 });
    }

    return NextResponse.json({
      data: { retention: updatedConfig.retention },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Unexpected error in PATCH /api/settings/retention:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

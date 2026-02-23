import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { listConfigVersionsQuerySchema, compareVersionsQuerySchema } from '@/lib/validation';
import { generateConfigDiff, formatDiffForDisplay, type ConfigDiffResult } from '@/lib/config-utils';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/agents/:id/config/versions
 * Get version history for an agent's configuration
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = listConfigVersionsQuerySchema.parse(queryParams);
    const { page, limit } = validatedQuery;
    const offset = (page - 1) * limit;

    // Verify agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get current config version for reference
    const { data: currentConfig } = await supabase
      .from('agent_configs')
      .select('version_id, version_number')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .single();

    // Get version history
    const { data: versions, error, count } = await supabase
      .from('agent_config_versions')
      .select(
        `
        *,
        changed_by_user:changed_by(id, name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .order('version_number', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching versions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      );
    }

    // Format versions
    const formattedVersions = versions?.map((version) => ({
      id: version.id,
      version_number: version.version_number,
      name: version.name,
      description: version.description,
      change_type: version.change_type,
      change_summary: version.change_summary,
      is_valid: version.is_valid,
      validation_errors: version.validation_errors,
      is_current: version.id === currentConfig?.version_id,
      created_at: version.created_at,
      changed_by: version.changed_by_user
        ? {
            id: version.changed_by_user.id,
            name: version.changed_by_user.name,
            avatar_url: version.changed_by_user.avatar_url,
          }
        : null,
    }));

    return NextResponse.json({
      data: formattedVersions,
      meta: {
        current_version: currentConfig?.version_number || 0,
        current_version_id: currentConfig?.version_id || null,
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in GET /api/agents/:id/config/versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/:id/config/versions/compare
 * Compare two configuration versions
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Parse request body
    const body = await request.json();
    const validatedData = compareVersionsQuerySchema.parse(body);
    const { version_a, version_b } = validatedData;

    // Verify agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Helper to fetch version config
    async function fetchVersion(versionIdOrNumber: string | number) {
      const isUuid = typeof versionIdOrNumber === 'string' && versionIdOrNumber.includes('-');

      const query = supabase
        .from('agent_config_versions')
        .select('id, version_number, config, name, created_at')
        .eq('agent_id', id)
        .eq('tenant_id', tenantId);

      if (isUuid) {
        return query.eq('id', versionIdOrNumber).single();
      } else {
        return query.eq('version_number', parseInt(String(versionIdOrNumber), 10)).single();
      }
    }

    // Fetch both versions
    const [{ data: versionA, error: errorA }, { data: versionB, error: errorB }] =
      await Promise.all([fetchVersion(version_a), fetchVersion(version_b)]);

    if (errorA || !versionA) {
      return NextResponse.json(
        { error: `Version A not found: ${version_a}` },
        { status: 404 }
      );
    }

    if (errorB || !versionB) {
      return NextResponse.json(
        { error: `Version B not found: ${version_b}` },
        { status: 404 }
      );
    }

    // Generate diff
    const diff = generateConfigDiff(versionA.config, versionB.config);

    return NextResponse.json({
      data: {
        version_a: {
          id: versionA.id,
          version_number: versionA.version_number,
          name: versionA.name,
          created_at: versionA.created_at,
        },
        version_b: {
          id: versionB.id,
          version_number: versionB.version_number,
          name: versionB.name,
          created_at: versionB.created_at,
        },
        diff: {
          ...diff,
          formatted: formatDiffForDisplay(diff),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agents/:id/config/versions/compare:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

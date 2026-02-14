import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { restoreConfigVersionSchema } from '@/lib/validation';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/agents/:id/config/restore
 * Restore an agent's configuration to a previous version
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = restoreConfigVersionSchema.parse(body);

    // Verify agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, config')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch the version to restore
    let versionQuery = supabase
      .from('agent_config_versions')
      .select('*')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId);

    if (validatedData.version_id) {
      versionQuery = versionQuery.eq('id', validatedData.version_id);
    } else if (validatedData.version_number) {
      versionQuery = versionQuery.eq('version_number', validatedData.version_number);
    }

    const { data: version, error: versionError } = await versionQuery.single();

    if (versionError || !version) {
      return NextResponse.json(
        {
          error: 'Version not found',
          message: validatedData.version_id
            ? `No version found with ID: ${validatedData.version_id}`
            : `No version found with number: ${validatedData.version_number}`
        },
        { status: 404 }
      );
    }

    // Get current config to check if already at this version
    const { data: currentConfig } = await supabase
      .from('agent_configs')
      .select('version_number')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (currentConfig?.version_number === version.version_number) {
      return NextResponse.json(
        {
          error: 'Already at this version',
          message: `Configuration is already at version ${version.version_number}`
        },
        { status: 400 }
      );
    }

    // Restore the configuration
    // We update the current config with the old version's config
    // The trigger will create a new version entry
    const { data: restoredConfig, error: updateError } = await supabase
      .from('agent_configs')
      .update({
        config: { ...version.config, _change_type: 'restore' },
        is_valid: version.is_valid,
        validation_errors: version.validation_errors,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error restoring config:', updateError);
      return NextResponse.json(
        { error: 'Failed to restore configuration', details: updateError.message },
        { status: 500 }
      );
    }

    // Update the new version with restore metadata
    await supabase
      .from('agent_config_versions')
      .update({
        name: `Restored from v${version.version_number}`,
        description: `Restored configuration to version ${version.version_number}${version.name ? ` "${version.name}"` : ''}`,
        change_type: 'restore',
        change_summary: {
          restored_from_version: version.version_number,
          restored_from_version_id: version.id,
          previous_version: currentConfig?.version_number || 0,
        },
        changed_by: userId,
      })
      .eq('id', restoredConfig.version_id);

    // Update the agent's config column for runtime
    await supabase
      .from('agents')
      .update({
        config: version.config,
        llm_config: version.config?.advanced || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    // Fetch the complete version info
    const { data: newVersion } = await supabase
      .from('agent_config_versions')
      .select('version_number, name, description, created_at')
      .eq('id', restoredConfig.version_id)
      .single();

    return NextResponse.json({
      message: `Configuration restored to version ${version.version_number}`,
      data: {
        agent_id: id,
        previous_version: currentConfig?.version_number || 0,
        restored_from_version: version.version_number,
        current_version: newVersion?.version_number || restoredConfig.version_number,
        version_id: restoredConfig.version_id,
        config: restoredConfig.config,
        is_valid: restoredConfig.is_valid,
        version_info: newVersion,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agents/:id/config/restore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

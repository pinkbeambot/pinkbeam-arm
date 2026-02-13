import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import {
  updateAgentConfigSchema,
  validateAgentConfig,
  stripEmptyValues,
  type UpdateAgentConfigInput,
} from '@/lib/validation';
import { z } from 'zod';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Helper to create Supabase client with auth
 */
async function createAuthClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return supabase;
}

/**
 * Helper to get tenant ID from user
 */
async function getTenantId(supabase: NonNullable<Awaited<ReturnType<typeof createAuthClient>>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !userProfile?.tenant_id) {
    return null;
  }

  return { tenantId: userProfile.tenant_id, user };
}

/**
 * GET /api/agents/:id/config
 * Get the current configuration for an agent
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantResult = await getTenantId(supabase);
    if (!tenantResult) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    const { tenantId } = tenantResult;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Verify agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get current config
    const { data: config, error: configError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (configError) {
      if (configError.code === 'PGRST116') {
        // No config exists yet - return default empty config
        return NextResponse.json({
          data: {
            agent_id: id,
            agent_name: agent.name,
            config: {},
            version_number: 0,
            is_valid: true,
            validation_errors: [],
            created_at: null,
            updated_at: null,
          },
        });
      }
      console.error('Error fetching config:', configError);
      return NextResponse.json(
        { error: 'Failed to fetch configuration', details: configError.message },
        { status: 500 }
      );
    }

    // Get version info
    const { data: version } = await supabase
      .from('agent_config_versions')
      .select('name, description, change_type, created_at')
      .eq('id', config.version_id)
      .single();

    return NextResponse.json({
      data: {
        agent_id: id,
        agent_name: agent.name,
        config: config.config,
        version_id: config.version_id,
        version_number: config.version_number,
        version_info: version || null,
        is_valid: config.is_valid,
        validation_errors: config.validation_errors,
        last_tested_at: config.last_tested_at,
        last_test_result: config.last_test_result,
        created_at: config.created_at,
        updated_at: config.updated_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/agents/:id/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/:id/config
 * Update the configuration for an agent (creates a new version)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantResult = await getTenantId(supabase);
    if (!tenantResult) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    const { tenantId, user } = tenantResult;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateAgentConfigSchema.parse(body);

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

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

    // Validate the configuration
    const strippedConfig = stripEmptyValues(validatedData.config);
    const validation = validateAgentConfig(strippedConfig);

    // Check if config already exists
    const { data: existingConfig } = await supabase
      .from('agent_configs')
      .select('id')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .single();

    let result;

    if (existingConfig) {
      // Update existing config
      const { data, error } = await supabase
        .from('agent_configs')
        .update({
          config: strippedConfig,
          is_valid: validation.isValid,
          validation_errors: validation.errors,
          updated_at: new Date().toISOString(),
        })
        .eq('agent_id', id)
        .eq('tenant_id', tenantId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating config:', error);
        return NextResponse.json(
          { error: 'Failed to update configuration', details: error.message },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('agent_configs')
        .insert({
          tenant_id: tenantId,
          agent_id: id,
          config: strippedConfig,
          is_valid: validation.isValid,
          validation_errors: validation.errors,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating config:', error);
        return NextResponse.json(
          { error: 'Failed to create configuration', details: error.message },
          { status: 500 }
        );
      }

      result = data;
    }

    // Update the version with name/description if provided
    if (validatedData.version_name || validatedData.version_description) {
      await supabase
        .from('agent_config_versions')
        .update({
          name: validatedData.version_name || null,
          description: validatedData.version_description || null,
          changed_by: user.id,
        })
        .eq('id', result.version_id);
    }

    // Also update the agent's config column for runtime access
    await supabase
      .from('agents')
      .update({
        config: strippedConfig,
        llm_config: strippedConfig.advanced || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      data: {
        agent_id: id,
        config: result.config,
        version_id: result.version_id,
        version_number: result.version_number,
        is_valid: result.is_valid,
        validation_errors: result.validation_errors,
        updated_at: result.updated_at,
      },
      meta: {
        validation: {
          is_valid: validation.isValid,
          warnings: validation.errors.filter(e => e.severity === 'warning').length,
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
    console.error('Unexpected error in PUT /api/agents/:id/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/:id/config
 * Reset the configuration to defaults (creates a new version)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantResult = await getTenantId(supabase);
    if (!tenantResult) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }
    const { tenantId, user } = tenantResult;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Verify agent exists and belongs to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Update config to empty (with version tracking via trigger)
    const { data, error } = await supabase
      .from('agent_configs')
      .update({
        config: {},
        is_valid: true,
        validation_errors: [],
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      console.error('Error resetting config:', error);
      return NextResponse.json(
        { error: 'Failed to reset configuration', details: error.message },
        { status: 500 }
      );
    }

    // Update version with reset info
    await supabase
      .from('agent_config_versions')
      .update({
        name: 'Reset to defaults',
        description: 'Configuration reset to default values',
        changed_by: user.id,
      })
      .eq('id', data.version_id);

    // Reset agent's config column
    await supabase
      .from('agents')
      .update({
        config: {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      message: 'Configuration reset to defaults',
      data: {
        agent_id: id,
        version_id: data.version_id,
        version_number: data.version_number,
      },
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/agents/:id/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

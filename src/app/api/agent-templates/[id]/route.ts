import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { applyTemplateSchema, mergeConfigs, type AgentConfig } from '@/lib/validation';
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

  if (profileError || !userProfile || !(userProfile as { tenant_id: string }).tenant_id) {
    return null;
  }

  return { tenantId: (userProfile as { tenant_id: string }).tenant_id, user };
}

/**
 * GET /api/agent-templates/:id
 * Get full details of a specific template
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

    // Fetch template
    const { data: template, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('id', id)
      .or(`is_system.eq.true,tenant_id.eq.${tenantId}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      console.error('Error fetching template:', error);
      return NextResponse.json(
        { error: 'Failed to fetch template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: template,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/agent-templates/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-templates/:id/apply
 * Apply a template to an agent (this would be a separate route, but included here for reference)
 * Actually, this is handled via /api/agents/:id/config with template_id in the request
 */

/**
 * DELETE /api/agent-templates/:id
 * Delete a custom template (system templates cannot be deleted)
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
    const { tenantId } = tenantResult;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Fetch template to check if it's a system template
    const { data: template, error: fetchError } = await supabase
      .from('agent_templates')
      .select('is_system, tenant_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch template', details: fetchError.message },
        { status: 500 }
      );
    }

    // Cannot delete system templates
    if (template.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 403 }
      );
    }

    // Cannot delete templates from other tenants
    if (template.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Cannot delete templates from other workspaces' },
        { status: 403 }
      );
    }

    // Delete template
    const { error } = await supabase
      .from('agent_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/agent-templates/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

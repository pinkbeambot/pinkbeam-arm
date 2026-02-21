import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { applyTemplateSchema, mergeConfigs, type AgentConfig } from '@/lib/validation';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/agent-templates/:id
 * Get full details of a specific template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

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
        { error: 'Failed to fetch template' },
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

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    // Fetch template to check if it's a system template
    const { data: template, error: fetchError } = await supabase
      .from('agent_templates' as never)
      .select('is_system, tenant_id')
      .eq('id', id)
      .single() as { data: { is_system: boolean; tenant_id: string } | null; error: { code?: string; message: string } | null };

    if (fetchError || !template) {
      if (fetchError?.code === 'PGRST116' || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      console.error('Failed to fetch template:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch template' },
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
        { error: 'Failed to delete template' },
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

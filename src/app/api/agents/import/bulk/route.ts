import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { generateUniqueSlug } from '@/lib/api/slug';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

const bulkAgentItemSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system']),
  description: z.string().max(2000).optional().default(''),
  capabilities: z.array(z.string()).optional().default([]),
  model: z.string().optional(),
});

const bulkImportSchema = z.object({
  agents: z.array(bulkAgentItemSchema).min(1).max(100),
});

/**
 * POST /api/agents/import/bulk
 * Create multiple agents from CSV import data
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase, userRole } = auth;

    const guard = requirePermission(userRole, 'agents:create');
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const { agents: agentsToCreate } = bulkImportSchema.parse(body);

    const results: { index: number; success: boolean; name: string; id?: string; error?: string }[] = [];

    for (let i = 0; i < agentsToCreate.length; i++) {
      const agentInput = agentsToCreate[i];

      try {
        // Generate unique slug
        const slug = await generateUniqueSlug(agentInput.name, tenantId, supabase);

        const { data: agent, error: insertError } = await supabase
          .from('agents')
          .insert({
            tenant_id: tenantId,
            name: agentInput.name,
            slug,
            role: agentInput.role,
            description: agentInput.description || '',
            capabilities: agentInput.capabilities || [],
            model: agentInput.model,
            depth: 1,
            status: 'initializing',
          })
          .select('id, name')
          .single();

        if (insertError) {
          results.push({
            index: i,
            success: false,
            name: agentInput.name,
            error: insertError.code === '23505'
              ? 'Agent with this name already exists'
              : insertError.message,
          });
        } else {
          results.push({
            index: i,
            success: true,
            name: agentInput.name,
            id: agent.id,
          });
        }
      } catch (err) {
        results.push({
          index: i,
          success: false,
          name: agentInput.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      data: {
        total: agentsToCreate.length,
        succeeded,
        failed,
        results,
      },
    }, { status: succeeded > 0 ? 201 : 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agents/import/bulk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

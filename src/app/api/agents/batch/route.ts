import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';

const batchUpdateSchema = z.object({
  agent_ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['pause', 'resume', 'delete']),
});

/**
 * @openapi
 * /agents/batch:
 *   post:
 *     summary: Perform bulk operations on agents
 *     description: >
 *       Performs a bulk action (pause, resume, or delete) on multiple agents.
 *       Returns per-agent results so callers can identify partial failures.
 *     tags:
 *       - Agents
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agent_ids, action]
 *             properties:
 *               agent_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *               action:
 *                 type: string
 *                 enum: [pause, resume, delete]
 *     responses:
 *       200:
 *         description: Batch operation completed (may include partial failures)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_ids, action } = batchUpdateSchema.parse(body);

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const results: { id: string; success: boolean; error?: string }[] = [];

    if (action === 'delete') {
      // Delete agents one by one to respect RLS and track individual failures
      for (const agentId of agent_ids) {
        const { error } = await supabase
          .from('agents')
          .delete()
          .eq('id', agentId)
          .eq('tenant_id', tenantId);

        if (error) {
          console.error(`Batch delete failed for agent ${agentId}:`, error);
          results.push({ id: agentId, success: false, error: 'Failed to delete agent' });
        } else {
          results.push({ id: agentId, success: true });
        }
      }
    } else {
      // pause or resume
      const newStatus = action === 'pause' ? 'paused' : 'active';

      for (const agentId of agent_ids) {
        const { error } = await supabase
          .from('agents')
          .update({ status: newStatus })
          .eq('id', agentId)
          .eq('tenant_id', tenantId);

        if (error) {
          console.error(`Batch ${action} failed for agent ${agentId}:`, error);
          results.push({ id: agentId, success: false, error: `Failed to ${action} agent` });
        } else {
          results.push({ id: agentId, success: true });
        }
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      data: {
        action,
        total: agent_ids.length,
        succeeded,
        failed,
        results,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Unexpected error in POST /api/agents/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

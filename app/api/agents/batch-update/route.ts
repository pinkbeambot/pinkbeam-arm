/**
 * POST /api/agents/batch-update
 * 
 * Bulk update multiple agents at once.
 * 
 * Body: {
 *   agents: [{ id: string, data: UpdateAgentInput }],
 * }
 * 
 * Response: {
 *   success: boolean,
 *   processed: number,
 *   succeeded: number,
 *   failed: number,
 *   errors: [{ index, id, message, code }],
 *   data: Agent[]
 * }
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { batchUpdateAgentsSchema } from '@/lib/validation';
import type { Database } from '@/lib/database';

type Agent = Database['public']['Tables']['agents']['Row'];

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = batchUpdateAgentsSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { agents } = validationResult.data;

    const results: Agent[] = [];
    const errors: Array<{ index: number; id: string; message: string; code?: string }> = [];

    // Process each agent update
    for (let i = 0; i < agents.length; i++) {
      const { id, data } = agents[i];

      try {
        // Verify agent belongs to tenant
        const { data: existingAgent, error: checkError } = await supabase
          .from('agents')
          .select('id')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .single();

        if (checkError || !existingAgent) {
          errors.push({
            index: i,
            id,
            message: 'Agent not found or access denied',
            code: 'NOT_FOUND',
          });
          continue;
        }

        // If parent_id is being changed, verify new parent belongs to tenant
        if (data.parent_id) {
          const { data: parentAgent, error: parentError } = await supabase
            .from('agents')
            .select('id')
            .eq('id', data.parent_id)
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .single();

          if (parentError || !parentAgent) {
            errors.push({
              index: i,
              id,
              message: 'Parent agent not found or access denied',
              code: 'INVALID_PARENT',
            });
            continue;
          }
        }

        // Update the agent
        const { data: updatedAgent, error: updateError } = await supabase
          .from('agents')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) {
          errors.push({
            index: i,
            id,
            message: updateError.message,
            code: updateError.code,
          });
          continue;
        }

        if (updatedAgent) {
          results.push(updatedAgent);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({
          index: i,
          id,
          message: errorMessage,
          code: 'EXCEPTION',
        });
      }
    }

    return apiSuccess({
      success: errors.length === 0,
      processed: agents.length,
      succeeded: results.length,
      failed: errors.length,
      errors,
      data: results,
    });
  } catch (err) {
    console.error('Batch update agents exception:', err);
    return apiError('Internal server error', 500);
  }
}

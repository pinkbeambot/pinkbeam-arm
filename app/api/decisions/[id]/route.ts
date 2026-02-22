/**
 * GET /api/decisions/[id]
 * 
 * Get a specific decision by ID.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;
  const { id } = await params;

  try {
    const { data: decision, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError('Decision not found', 404);
      }
      return apiError('Failed to fetch decision', 500, error.message);
    }

    return apiSuccess(decision);
  } catch (err) {
    return apiError('Internal server error', 500);
  }
}

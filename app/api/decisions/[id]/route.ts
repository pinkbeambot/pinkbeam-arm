/**
 * GET /api/decisions/[id]
 * 
 * Get a specific decision by ID.
<<<<<<< HEAD
 * 
 * Response: { data: Decision }
=======
>>>>>>> eng-be/api-extensions
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
<<<<<<< HEAD
import type { Database } from '@/lib/database';

type Decision = Database['public']['Tables']['decisions']['Row'];
=======
>>>>>>> eng-be/api-extensions

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
<<<<<<< HEAD
      console.error('Decision GET error:', error);
=======
>>>>>>> eng-be/api-extensions
      return apiError('Failed to fetch decision', 500, error.message);
    }

    return apiSuccess(decision);
  } catch (err) {
<<<<<<< HEAD
    console.error('Decision GET exception:', err);
=======
>>>>>>> eng-be/api-extensions
    return apiError('Internal server error', 500);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiSuccess, apiError } from '@/lib/api/response';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * @openapi
 * /user/profile:
 *   get:
 *     summary: Get current user's profile with role
 *     description: Returns the authenticated user's profile including their role
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [owner, admin, member, viewer]
 *                 name:
 *                   type: string
 *                 tenant_id:
 *                   type: string
 *                   format: uuid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile with role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, name, tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile lookup error:', profileError);
      return apiError('User not found', 404, { code: 'USER_NOT_FOUND' });
    }

    return apiSuccess({
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      name: userProfile.name,
      tenant_id: userProfile.tenant_id,
    });
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error);
    return apiError('Internal server error', 500);
  }
}

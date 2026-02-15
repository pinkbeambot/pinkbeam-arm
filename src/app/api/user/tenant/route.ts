import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * @openapi
 * /user/tenant:
 *   get:
 *     summary: Get current user's tenant
 *     description: Returns the tenant ID for the authenticated user
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's tenant ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenant_id:
 *                   type: string
 *                   format: uuid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Tenant not found
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant from user profile
    // Use service role bypass via the users_self_access policy which allows
    // users to see themselves by auth_id even without tenant context
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      console.error('Tenant lookup error:', profileError);
      return NextResponse.json(
        { error: 'Tenant not found', code: 'TENANT_NOT_FOUND' },
        { status: 403 }
      );
    }

    // Get tenant details including onboarding status
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, onboarding_completed, onboarding_completed_at, created_at')
      .eq('id', userProfile.tenant_id)
      .single();

    if (tenantError) {
      console.error('Tenant details lookup error:', tenantError);
      // Still return tenant_id even if full details fail
      return NextResponse.json({
        tenant_id: userProfile.tenant_id,
      });
    }

    return NextResponse.json({
      tenant_id: userProfile.tenant_id,
      tenant: tenant,
    });
  } catch (error) {
    console.error('Error in GET /api/user/tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

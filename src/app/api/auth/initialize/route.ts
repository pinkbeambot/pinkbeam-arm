import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Generate a URL-friendly unique slug from email
 */
function generateSlug(email: string): string {
  const localPart = email.split('@')[0];
  const sanitized = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${sanitized}-${randomSuffix}`;
}

/**
 * POST /api/auth/initialize
 * Called after OTP verification to create tenant + user record for new signups.
 * Uses the session cookie to identify the authenticated user.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const authUser = session.user;

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if user already exists
  const { data: existingUser, error: lookupError } = await adminClient
    .from('users')
    .select('id, tenant_id')
    .eq('auth_id', authUser.id)
    .single();

  if (lookupError && (lookupError as { code?: string }).code !== 'PGRST116') {
    return NextResponse.json({ error: 'User lookup failed' }, { status: 500 });
  }

  if (existingUser?.tenant_id) {
    return NextResponse.json({ success: true, tenantId: existingUser.tenant_id, isNewUser: false });
  }

  // New user — create tenant + user record
  const tenantName = authUser.email
    ? `${authUser.email.split('@')[0]}'s Workspace`
    : 'My Workspace';

  const slug = authUser.email
    ? generateSlug(authUser.email)
    : `workspace-${Date.now()}`;

  const { data: tenant, error: tenantError } = await adminClient
    .from('tenants')
    .insert({ name: tenantName, slug, status: 'active', plan: 'starter' })
    .select('id')
    .single();

  if (tenantError || !tenant?.id) {
    return NextResponse.json({ error: 'Tenant creation failed' }, { status: 500 });
  }

  const userName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';

  const { error: userError } = await adminClient
    .from('users')
    .insert({
      auth_id: authUser.id,
      tenant_id: tenant.id,
      email: authUser.email || '',
      name: userName,
      role: 'owner',
      status: 'active',
    });

  if (userError) {
    await adminClient.from('tenants').delete().eq('id', tenant.id);
    return NextResponse.json({ error: 'User record creation failed' }, { status: 500 });
  }

  // Update auth metadata with tenant_id
  await adminClient.auth.admin.updateUserById(authUser.id, {
    user_metadata: { tenant_id: tenant.id, onboarding_complete: false },
  });

  return NextResponse.json({ success: true, tenantId: tenant.id, isNewUser: true });
}

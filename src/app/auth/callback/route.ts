import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Auth callback route for magic links
 * Handles the OAuth/Magic Link redirect from Supabase
 * Creates user record and tenant for new signups
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/portal';

  if (code) {
    // Create a response to modify
    const response = NextResponse.redirect(`${origin}${next}`);

    // Create Supabase client with cookie handling
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    });

    // Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error.message);
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }

    // Create user record and tenant for new users
    if (session?.user) {
      const initError = await initializeUserAndTenant(session.user);
      if (initError) {
        console.error('Error initializing user:', initError);
        // Continue anyway - user is authenticated, they can retry
      }
    }

    // Successful authentication, redirect to portal
    return response;
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}

/**
 * Initialize user record and tenant for new signups
 * Uses service role key to bypass RLS
 */
async function initializeUserAndTenant(authUser: { id: string; email?: string }): Promise<string | null> {
  try {
    // Check if SUPABASE_SERVICE_ROLE_KEY is available
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return 'Service role key not configured';
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user already exists in public.users
    const { data: existingUser, error: lookupError } = await adminClient
      .from('users')
      .select('id, tenant_id')
      .eq('auth_id', authUser.id)
      .single();

    if (lookupError && lookupError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected for new users
      console.error('Error looking up user:', lookupError.message);
      return lookupError.message;
    }

    // User already exists, nothing to do
    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      return null;
    }

    // Create new tenant for this user
    const tenantName = authUser.email 
      ? `${authUser.email.split('@')[0]}'s Workspace`
      : 'My Workspace';

    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: tenantName,
        slug: `workspace-${Date.now()}`,
        status: 'active',
        plan: 'free',
      })
      .select('id')
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError.message);
      return tenantError.message;
    }

    // Create user record linked to auth user
    const { error: userError } = await adminClient
      .from('users')
      .insert({
        auth_id: authUser.id,
        tenant_id: tenant.id,
        email: authUser.email || '',
        role: 'admin', // First user is admin
        status: 'active',
      });

    if (userError) {
      console.error('Error creating user record:', userError.message);
      return userError.message;
    }

    // Update auth user metadata with tenant_id
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: { tenant_id: tenant.id },
      }
    );

    if (updateError) {
      console.error('Error updating auth user metadata:', updateError.message);
      // Non-fatal - user can still use the app
    }

    console.log('Successfully initialized user and tenant:', {
      userId: authUser.id,
      tenantId: tenant.id,
    });

    return null;
  } catch (err) {
    console.error('Unexpected error initializing user:', err);
    return err instanceof Error ? err.message : 'Unknown error';
  }
}

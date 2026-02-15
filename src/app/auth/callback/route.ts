import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Generate a URL-friendly unique slug from email
 * Format: local-part-XXXX (where XXXX is random suffix for uniqueness)
 */
function generateSlug(email: string): string {
  const localPart = email.split('@')[0];
  // Remove special chars, replace spaces/dots with hyphens
  const sanitized = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Add random 4-char suffix for uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${sanitized}-${randomSuffix}`;
}

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
    // Create a mutable response (required for Next.js 15 + supabase-ssr)
    let response = NextResponse.redirect(`${origin}${next}`);

    // Create Supabase client with cookie handling
    // MUST recreate response after each cookie modification for Next.js 15 compatibility
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.redirect(`${origin}${next}`, {
            headers: request.headers,
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.redirect(`${origin}${next}`, {
            headers: request.headers,
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    });

    // Exchange the code for a session
    // This triggers the cookie set operations above
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error.message);
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }

    // Create user record and tenant for new users
    if (session?.user) {
      const initResult = await initializeUserAndTenant(session.user);
      
      if (initResult.error) {
        console.error('Error initializing user and tenant:', initResult.error);
        // Redirect to error page - user needs tenant to use the app
        const errorUrl = new URL('/login', origin);
        errorUrl.searchParams.set('error', 'tenant_creation_failed');
        errorUrl.searchParams.set('message', encodeURIComponent(initResult.error));
        return NextResponse.redirect(errorUrl);
      }
      
      console.log('User and tenant initialized successfully:', {
        userId: session.user.id,
        tenantId: initResult.tenantId,
        isNewUser: initResult.isNewUser,
      });
    }

    // Successful authentication - return the response with cookies set
    return response;
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}

interface InitResult {
  tenantId: string | null;
  isNewUser: boolean;
  error: string | null;
}

/**
 * Initialize user record and tenant for new signups
 * Uses service role key to bypass RLS
 * 
 * Returns the tenantId on success, or an error message on failure
 */
async function initializeUserAndTenant(authUser: { id: string; email?: string; user_metadata?: { name?: string } }): Promise<InitResult> {
  // Check if SUPABASE_SERVICE_ROLE_KEY is available
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
    return { tenantId: null, isNewUser: false, error: 'Service role key not configured' };
  }

  // Create admin client with service role key
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Check if user already exists in public.users with retry
    let existingUser: { id: string; tenant_id: string } | null = null;
    let lookupError: Error | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await adminClient
        .from('users')
        .select('id, tenant_id')
        .eq('auth_id', authUser.id)
        .single();
      
      existingUser = result.data;
      lookupError = result.error;
      
      if (!lookupError || (lookupError as { code?: string }).code !== 'PGRST116') {
        break; // Either found user or got a real error (not "no rows")
      }
      
      // PGRST116 = no rows returned, wait a bit and retry (might be eventual consistency)
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }

    if (lookupError && (lookupError as { code?: string }).code !== 'PGRST116') {
      console.error('Error looking up user:', lookupError.message);
      return { tenantId: null, isNewUser: false, error: `User lookup failed: ${lookupError.message}` };
    }

    // User already exists, return their tenant
    if (existingUser?.tenant_id) {
      console.log('User already exists with tenant:', existingUser.tenant_id);
      return { tenantId: existingUser.tenant_id, isNewUser: false, error: null };
    }

    // ============================================================================
    // Create new tenant and user (NEW SIGNUP FLOW)
    // ============================================================================
    
    console.log('Creating new tenant and user for:', authUser.email);

    // Generate tenant details
    const tenantName = authUser.email 
      ? `${authUser.email.split('@')[0]}'s Workspace`
      : 'My Workspace';
    
    const slug = authUser.email 
      ? generateSlug(authUser.email)
      : `workspace-${Date.now()}`;

    // Create tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: tenantName,
        slug: slug,
        status: 'active',
        plan: 'starter',
      })
      .select('id')
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError.message);
      return { tenantId: null, isNewUser: false, error: `Tenant creation failed: ${tenantError.message}` };
    }

    if (!tenant?.id) {
      return { tenantId: null, isNewUser: false, error: 'Tenant creation returned no data' };
    }

    // Create user record linked to auth user
    const userName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
    
    const { error: userError } = await adminClient
      .from('users')
      .insert({
        auth_id: authUser.id,
        tenant_id: tenant.id,
        email: authUser.email || '',
        name: userName,
        role: 'owner', // First user is owner
        status: 'active',
      });

    if (userError) {
      console.error('Error creating user record:', userError.message);
      
      // Attempt to clean up the orphaned tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      
      return { tenantId: null, isNewUser: false, error: `User record creation failed: ${userError.message}` };
    }

    // Update auth user metadata with tenant_id for faster lookups
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: { 
          tenant_id: tenant.id,
          onboarding_complete: false,
        },
      }
    );

    if (updateError) {
      console.error('Error updating auth user metadata:', updateError.message);
      // Non-fatal - user can still use the app
    }

    console.log('Successfully created tenant and user:', {
      userId: authUser.id,
      tenantId: tenant.id,
      tenantName,
    });

    return { tenantId: tenant.id, isNewUser: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during initialization';
    console.error('Unexpected error initializing user:', err);
    return { tenantId: null, isNewUser: false, error: errorMessage };
  }
}

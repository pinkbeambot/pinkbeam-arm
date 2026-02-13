import { createClient } from '@supabase/supabase-js';
import { Database } from './database';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client (RLS enforced)
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for API routes, RLS enforced via JWT)
export function createServerClient(authToken?: string) {
  if (authToken) {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    });
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Service role client (bypasses RLS - use only in Edge Functions/secure contexts)
export const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper to set tenant context for RLS
export async function setTenantContext(supabase: ReturnType<typeof createClient>, tenantId: string) {
  await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
}

// Get current user from session
export async function getCurrentUser(authToken: string) {
  const supabase = createServerClient(authToken);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  // Get extended user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();
  
  return profile;
}

// Get user's tenant
export async function getCurrentTenant(authToken: string) {
  const user = await getCurrentUser(authToken);
  if (!user) return null;
  
  const supabase = createServerClient(authToken);
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', user.tenant_id)
    .single();
  
  return tenant;
}

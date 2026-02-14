/**
 * Service Role Supabase Client
 * 
 * This client uses the service role key and bypasses RLS policies.
 * ONLY use this in server-side API routes AFTER validating user auth and tenant.
 * 
 * This matches the pattern used by Edge Functions (createAdminClient).
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
}

/**
 * Create a Supabase client with service role privileges
 * This bypasses RLS policies - use with caution!
 * Only call after validating user authentication and tenant membership.
 */
export function createServiceRoleClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

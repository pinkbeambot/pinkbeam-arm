import { createBrowserClient } from '@supabase/ssr';
import { createClient as createServerClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database';
import type { Agent, RealtimeChangePayload } from '@/types';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Create a browser client for client-side usage
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Create a server client for server-side usage
 * Use service role key for admin operations
 */
export function createServerAdminClient() {
  return createServerClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Create a server client with user's session
 */
export function createServerUserClient() {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey);
}

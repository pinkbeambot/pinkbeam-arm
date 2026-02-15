/**
 * Service Role Supabase Client (Singleton)
 *
 * Uses module-level singleton to reuse the same client instance across
 * API route invocations within the same server process. Supabase JS clients
 * are stateless REST wrappers, so sharing one instance is safe and avoids
 * unnecessary object allocation per request.
 *
 * Actual database connection pooling is handled by Supabase's built-in
 * PgBouncer layer — this singleton eliminates redundant client construction.
 *
 * ONLY use in server-side API routes AFTER validating user auth and tenant.
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

// Module-level singleton — reused across all requests in the same process
let serviceRoleClient: ReturnType<typeof createClient> | null = null;

// Connection metrics for monitoring
const connectionMetrics = {
  clientCreatedAt: null as Date | null,
  requestCount: 0,
};

/**
 * Get the singleton Supabase client with service role privileges.
 * This bypasses RLS policies — use with caution!
 * Only call after validating user authentication and tenant membership.
 */
export function createServiceRoleClient() {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    connectionMetrics.clientCreatedAt = new Date();
  }

  connectionMetrics.requestCount++;
  return serviceRoleClient;
}

/**
 * Get connection metrics for monitoring/debugging.
 */
export function getConnectionMetrics() {
  return {
    ...connectionMetrics,
    isInitialized: serviceRoleClient !== null,
  };
}

import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { type TypedDatabase } from '@/lib/database';

// Environment variables - server-side only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client');
}

/**
 * Service role client - bypasses RLS
 * ⚠️ WARNING: Only use in server contexts (API routes, Edge Functions)
 * This client has unrestricted database access
 */
export const supabaseService = createClient<TypedDatabase>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

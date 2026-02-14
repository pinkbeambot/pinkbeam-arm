/**
 * Authentication Utilities
 * 
 * This module provides authentication and authorization helpers for the ARM platform.
 * 
 * @example
 * // API Route with authentication
 * import { withAuth, createServerClientWithAuth, successResponse } from '@/lib/auth';
 * 
 * export const GET = withAuth(async (request) => {
 *   const { supabase, context } = await createServerClientWithAuth(request);
 *   
 *   const { data, error } = await supabase
 *     .from('agents')
 *     .select('*');
 *   
 *   if (error) throw error;
 *   
 *   return successResponse(data);
 * });
 */

// Tenant Context
export {
  getTenantContextFromHeaders,
  setTenantContext,
  createServerClientWithContext,
  createClientFromCookies,
  validateAuthAndGetContext,
  createServiceClient,
  getTenantContextFromSession,
  refreshSession,
  userHasCapability,
  withAuth as withAuthHandler,
  type TenantContext,
  type AuthResult,
} from './tenant-context';

// API Helpers
export {
  withAuth,
  createAuthClient,
  extractBearerToken,
  createServerClientWithAuth,
  authErrors,
  successResponse,
  paginatedResponse,
  type AuthenticatedRequest,
} from './api-helpers';

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
  withAuthAndValidation,
  withAuthAndQueryValidation,
  createAuthClient,
  extractBearerToken,
  createServerClientWithAuth,
  legacyAuthErrors,
  successResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  getPaginationParams,
  type AuthenticatedRequest,
} from './api-helpers';

// Error Handling
export {
  AuthError,
  authErrors,
  isAuthError,
  isZodError,
  handleAuthError,
  type AuthErrorCode,
} from './errors';

/**
 * Authentication Errors
 * 
 * Custom error classes and types for authentication and authorization errors.
 * Provides standardized error handling across the API.
 */

import type { APIError } from '@/lib/validation';

// ============================================================================
// Error Codes
// ============================================================================

export type AuthErrorCode = 
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'INVALID_TOKEN'
  | 'TENANT_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_PERMISSIONS';

// ============================================================================
// Auth Error Class
// ============================================================================

/**
 * Custom error class for authentication/authorization errors
 */
export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: AuthErrorCode,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }

  /**
   * Convert to API error response format
   */
  toAPIError(): APIError {
    return {
      error: this.message,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ============================================================================
// Predefined Error Factory Functions
// ============================================================================

export const authErrors = {
  unauthorized: (message = 'Authentication required'): AuthError =>
    new AuthError(message, 'UNAUTHORIZED', 401),

  invalidToken: (message = 'Invalid or expired token'): AuthError =>
    new AuthError(message, 'INVALID_TOKEN', 401),

  sessionExpired: (message = 'Session has expired'): AuthError =>
    new AuthError(message, 'SESSION_EXPIRED', 401),

  forbidden: (message = 'Access denied'): AuthError =>
    new AuthError(message, 'FORBIDDEN', 403),

  tenantNotFound: (message = 'Tenant context not found'): AuthError =>
    new AuthError(message, 'TENANT_NOT_FOUND', 403),

  insufficientPermissions: (message = 'Insufficient permissions'): AuthError =>
    new AuthError(message, 'INSUFFICIENT_PERMISSIONS', 403),

  notFound: (message = 'Resource not found'): AuthError =>
    new AuthError(message, 'NOT_FOUND', 404),

  validationError: (details: unknown): AuthError =>
    new AuthError('Validation error', 'VALIDATION_ERROR', 400, details),

  rateLimited: (message = 'Too many requests'): AuthError =>
    new AuthError(message, 'RATE_LIMITED', 429),

  internalError: (message = 'Internal server error'): AuthError =>
    new AuthError(message, 'INTERNAL_ERROR', 500),
};

// ============================================================================
// Error Type Guards
// ============================================================================

/**
 * Check if error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Check if error is a Zod validation error
 */
export function isZodError(error: unknown): error is { issues: Array<{ path: (string | number)[]; message: string; code: string }> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as Record<string, unknown>).issues)
  );
}

// ============================================================================
// Error Handler
// ============================================================================

/**
 * Handle errors and convert to standardized format
 */
export function handleAuthError(error: unknown): AuthError {
  if (isAuthError(error)) {
    return error;
  }

  if (isZodError(error)) {
    return authErrors.validationError(
      error.issues.map(issue => ({
        path: issue.path.map(String),
        message: issue.message,
        code: issue.code,
      }))
    );
  }

  if (error instanceof Error) {
    return authErrors.internalError(error.message);
  }

  return authErrors.internalError('Unknown error occurred');
}

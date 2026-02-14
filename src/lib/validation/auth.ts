/**
 * Authentication Validation Schemas
 * 
 * Zod schemas for validating authentication-related requests and tokens.
 */

import { z } from 'zod';

// ============================================================================
// JWT Token Validation
// ============================================================================

/**
 * JWT claims structure expected in Supabase auth tokens
 */
export const jwtClaimsSchema = z.object({
  sub: z.string().uuid(), // User ID (auth.uid())
  email: z.string().email().optional(),
  phone: z.string().optional(),
  app_metadata: z.object({
    provider: z.string().optional(),
    providers: z.array(z.string()).optional(),
    tenant_id: z.string().uuid().optional(),
  }).optional().default({}),
  user_metadata: z.object({
    tenant_id: z.string().uuid().optional(),
    full_name: z.string().optional(),
    avatar_url: z.string().url().optional(),
  }).optional().default({}),
  role: z.enum(['authenticated', 'service_role']).optional(),
  aud: z.string(),
  exp: z.number().int(),
  iat: z.number().int(),
  iss: z.string().optional(),
});

/**
 * Authorization header validation
 */
export const authorizationHeaderSchema = z.string()
  .regex(/^Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, {
    message: 'Invalid authorization header format. Expected: Bearer <jwt_token>',
  });

// ============================================================================
// Tenant Context Validation
// ============================================================================

/**
 * Tenant context extracted from middleware headers
 */
export const tenantContextSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  authToken: z.string().optional(),
});

/**
 * Auth result from validation
 */
export const authResultSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    tenantId: z.string().uuid(),
  }).nullable(),
  error: z.string().nullable(),
  status: z.union([z.literal(200), z.literal(401), z.literal(403), z.literal(500)]),
});

// ============================================================================
// API Request Validation
// ============================================================================

/**
 * Login request body
 */
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

/**
 * Signup request body
 */
export const signupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  tenant_name: z.string().min(1).max(100).optional(),
  full_name: z.string().min(1).max(100).optional(),
});

/**
 * Refresh token request
 */
export const refreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

/**
 * Magic link request
 */
export const magicLinkRequestSchema = z.object({
  email: z.string().email(),
  redirect_to: z.string().url().optional(),
});

/**
 * OAuth provider request
 */
export const oauthRequestSchema = z.object({
  provider: z.enum(['google', 'github', 'azure', 'slack']),
  redirect_to: z.string().url().optional(),
});

/**
 * Invite user request (admin only)
 */
export const inviteUserRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  send_email: z.boolean().default(true),
});

// ============================================================================
// Error Response Schemas
// ============================================================================

/**
 * Standard API error response
 */
export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'INTERNAL_ERROR',
    'INVALID_TOKEN',
    'TENANT_NOT_FOUND',
    'SESSION_EXPIRED',
    'RATE_LIMITED',
    'INSUFFICIENT_PERMISSIONS',
  ]),
  message: z.string().optional(),
  details: z.unknown().optional(),
});

/**
 * Validation error details
 */
export const validationErrorDetailsSchema = z.array(z.object({
  path: z.array(z.string()),
  message: z.string(),
  code: z.string(),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type JWTClaims = z.infer<typeof jwtClaimsSchema>;
export type TenantContext = z.infer<typeof tenantContextSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type OAuthRequest = z.infer<typeof oauthRequestSchema>;
export type InviteUserRequest = z.infer<typeof inviteUserRequestSchema>;
export type APIError = z.infer<typeof apiErrorSchema>;
export type ValidationErrorDetails = z.infer<typeof validationErrorDetailsSchema>;

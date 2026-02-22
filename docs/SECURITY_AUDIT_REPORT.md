# ARM Platform Security Audit Report
**Date:** February 21, 2026  
**Auditor:** ENG-BE (Backend Engineer)  
**Branch:** eng-be/security-audit  
**Status:** Production Readiness Review

---

## Executive Summary

The ARM platform has a **strong security foundation** with proper multi-tenancy via RLS, comprehensive authentication/authorization, CSRF protection, rate limiting, and secure configuration management. Most critical security controls are implemented correctly.

### Overall Security Grade: **B+**
- ✅ **Strengths:** RLS policies, RBAC, CSP headers, CSRF protection, input validation
- ⚠️ **Concerns:** 19 npm audit vulnerabilities, some console logging, missing encryption for PII
- 🔧 **Action Required:** Fix high-severity dependencies, review logging practices

---

## 1. Dependency Audit

### Findings

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ None |
| High | 18 | ⚠️ Needs attention |
| Moderate | 1 | ⚠️ Fix available |

### Vulnerability Details

**High Severity (18):**
- `minimatch <10.2.1` - ReDoS via repeated wildcards (CVE pending)
- Dependencies: `@eslint/config-array`, `eslint`, `glob`, `swagger-jsdoc`, `next-swagger-doc`
- No direct fix available - requires upstream updates

**Moderate Severity (1):**
- `ajv <6.14.0` - ReDoS when using `$data` option (GHSA-2g4f-4pwh-qvx6)
- Fix available via `npm audit fix`

### Outdated Packages (16)
Key outdated dependencies:
- `@supabase/supabase-js`: 2.95.3 → 2.97.0 (security patches)
- `eslint`: 9.39.2 → 10.0.1 (major version)
- `next`: 16.1.6 (current, check for patches)
- `@tailwindcss/postcss`: 4.1.18 → 4.2.0

### Recommendations

1. **Immediate:** Run `npm audit fix` to resolve moderate severity issues
2. **Short-term:** Update `@supabase/supabase-js` to latest for security patches
3. **Monitor:** Track `minimatch` upstream fixes; the vulnerability is in dev dependencies only
4. **Consider:** Replace `next-swagger-doc` with alternative if unmaintained

---

## 2. Code Security Review

### 2.1 Hardcoded Secrets/Credentials

**Status:** ✅ **PASS**

- No hardcoded API keys, passwords, or secrets found in source code
- All sensitive values properly stored in environment variables
- `.env.local` correctly listed in `.gitignore`
- Webhook secrets generated using `crypto.randomBytes()` (32 bytes)

**Verified Patterns:**
```typescript
// ✅ Correct: Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ✅ Correct: Cryptographically secure generation
const secret = `whsec_${randomBytes(32).toString('hex')}`;
```

### 2.2 API Authentication Flows

**Status:** ✅ **PASS**

Authentication implementation is robust:

| Component | Status | Notes |
|-----------|--------|-------|
| JWT Validation | ✅ | Bearer token extraction with `authenticateRequest()` |
| Tenant Isolation | ✅ | Headers `x-tenant-id`, `x-user-id` set by middleware |
| Service Role | ✅ | Singleton pattern with RLS bypass for server operations |
| Token Refresh | ✅ | Automatic via Supabase SSR |
| Dev Auth Bypass | ✅ | Development-only, build fails in production |

**Key Implementation:**
```typescript
// src/lib/api/auth.ts
export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... token validation, tenant lookup
}
```

### 2.3 Input Sanitization

**Status:** ✅ **PASS**

Comprehensive Zod validation across all API routes:

| Endpoint | Validation Schema | SQL Injection Safe |
|----------|-------------------|-------------------|
| POST /api/tasks | `createTaskSchema` | ✅ Parameterized queries |
| PATCH /api/tasks/[id] | `updateTaskSchema` | ✅ Parameterized queries |
| POST /api/agents | `createAgentSchema` | ✅ Parameterized queries |
| POST /api/decisions | `createDecisionSchema` | ✅ Parameterized queries |
| All endpoints | Zod schemas | ✅ No raw SQL |

**Validation Patterns:**
- UUID format validation for all IDs
- String length limits enforced
- Enum validation for status/priority fields
- Date format validation (ISO 8601)

### 2.4 SQL Injection Prevention

**Status:** ✅ **PASS**

- No raw SQL queries found in codebase
- All database operations use Supabase query builder (parameterized)
- RLS policies enforced at database level

**Example:**
```typescript
// ✅ Safe - parameterized query
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('tenant_id', tenantId)  // Parameterized
  .eq('status', status);       // Parameterized
```

---

## 3. Environment Security

### 3.1 Sensitive Data in Logs

**Status:** ⚠️ **WARNING**

**Issues Found:**
- Console logging in auth callback exposes email: `console.log('Creating new tenant and user for:', authUser.email)`
- Error logs throughout API routes may include database error details

**Locations:**
- `src/app/auth/callback/route.ts:187`
- Multiple API route error handlers

**Recommendation:**
- Sanitize logs to remove PII (emails, names)
- Use structured logging with PII redaction
- Review all `console.error` statements for sensitive data

### 3.2 Environment Variable Handling

**Status:** ✅ **PASS**

- `.env.local` in `.gitignore` ✅
- `.env.example` provided for documentation ✅
- Environment validation in `service-role.ts`:
```typescript
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required environment variables...');
}
```

### 3.3 CORS Configuration

**Status:** ⚠️ **REVIEW REQUIRED**

**Edge Functions CORS:**
```typescript
'Access-Control-Allow-Origin': '*',  // ⚠️ Very permissive
```

**Issue:** Edge functions allow any origin (`*`), which could enable:
- Unauthorized API access from malicious sites
- CSRF bypass attempts

**Recommendation:**
- Restrict CORS to known origins:
```typescript
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://app.pinkbeam.io',
];
```

### 3.4 CSP Headers

**Status:** ✅ **PASS**

Comprehensive Content Security Policy in `next.config.ts`:

```
default-src 'self'
script-src 'self' 'unsafe-inline' (unsafe-eval in dev)
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: ${supabaseUrl}
connect-src 'self' ${supabaseUrl} ${supabaseWss}
frame-ancestors 'none'
upgrade-insecure-requests
```

**Additional Headers:**
- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅

---

## 4. Authentication & Authorization

### 4.1 JWT Handling

**Status:** ✅ **PASS**

| Aspect | Implementation | Status |
|--------|----------------|--------|
| Token Storage | HttpOnly cookies (Supabase SSR) | ✅ |
| Token Validation | Server-side via `auth.getUser()` | ✅ |
| Expiration | Managed by Supabase Auth | ✅ |
| Refresh | Automatic via Supabase client | ✅ |

### 4.2 RBAC Implementation

**Status:** ✅ **PASS**

Well-implemented role-based access control:

**Roles:** `owner` → `admin` → `member` → `viewer`

**Permission Matrix (verified):**
| Permission | owner | admin | member | viewer |
|------------|-------|-------|--------|--------|
| agents:create | ✅ | ✅ | ❌ | ❌ |
| agents:delete | ✅ | ❌ | ❌ | ❌ |
| tasks:create | ✅ | ✅ | ✅ | ❌ |
| billing:manage | ✅ | ❌ | ❌ | ❌ |
| team:manage | ✅ | ❌ | ❌ | ❌ |

**Implementation:**
```typescript
// src/lib/rbac/server.ts
export function withPermission(
  requiredPermission: PermissionAction,
  handler: RBACHandler
) { /* validates permission before handler execution */ }
```

### 4.3 Session Management

**Status:** ✅ **PASS**

- Sessions stored in Supabase Auth (server-side)
- Cookie-based session with `SameSite=Lax`
- Session cleanup cron job runs every 6 hours
- CSRF protection via double-submit cookie pattern

### 4.4 CSRF Protection

**Status:** ✅ **PASS**

Two-layer defense implemented:

1. **Origin Validation:** Validates Origin/Referer headers match app URL
2. **Double-Submit Cookie:** Cryptographically random token (32 bytes)

```typescript
// src/lib/middleware/csrf.ts
function generateCsrfToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
```

### 4.5 Rate Limiting

**Status:** ✅ **PASS**

Per-tenant rate limiting implemented:

| Tier | Limit | Implementation |
|------|-------|----------------|
| free | 100 req/min | Redis-based with fallback |
| pro | 1000 req/min | Database + cache |

---

## 5. Data Security

### 5.1 Database RLS Policies

**Status:** ✅ **PASS**

All 14 tables have RLS enabled with tenant isolation:

| Table | RLS Policy | Status |
|-------|-----------|--------|
| tenants | `tenant_isolation` | ✅ |
| users | `users_tenant_isolation` + `users_self_access` | ✅ |
| agents | `agents_tenant_isolation` | ✅ |
| tasks | `tasks_tenant_isolation` | ✅ |
| decisions | `decisions_tenant_isolation` | ✅ |
| escalations | `escalations_tenant_isolation` | ✅ |
| messages | `messages_tenant_isolation` | ✅ |
| activities | `activities_tenant_isolation` | ✅ |
| files | `files_tenant_isolation` | ✅ |

**Service Role Bypass:** Properly scoped to `service_role` only:
```sql
CREATE POLICY service_role_bypass_tasks ON tasks
  FOR ALL TO service_role USING (true);
```

### 5.2 Data Encryption

**Status:** ⚠️ **PARTIAL**

| Layer | Status | Notes |
|-------|--------|-------|
| At Rest (Supabase) | ✅ | AES-256 (managed by Supabase) |
| In Transit | ✅ | TLS 1.3 enforced |
| Application-level | ❌ | No field-level encryption for PII |
| Webhook Secrets | ⚠️ | Field exists (`secret_encrypted`) but usage unclear |

**PII Fields Not Encrypted:**
- `users.email`
- `users.name`
- `escalations.resolution_answer`
- `messages.payload` (may contain sensitive data)

**Recommendation:**
- Consider field-level encryption for sensitive PII
- Verify `secret_encrypted` field is actually encrypted

### 5.3 PII Handling

**Status:** ⚠️ **REVIEW REQUIRED**

**PII Found in Schema:**
- `users.email` - Plain text
- `users.name` - Plain text  
- `team_invitations.email` - Plain text

**Logging Concerns:**
- Email addresses logged in auth callback
- Error logs may expose user data

**Recommendation:**
- Implement PII redaction in logs
- Consider data masking for non-production environments
- Document data retention policies

### 5.4 Backup Security

**Status:** ✅ **PASS** (Managed by Supabase)

- Automated daily backups via Supabase
- Point-in-time recovery available
- Backup encryption at rest (AES-256)

---

## 6. Additional Security Findings

### 6.1 Security Headers (Vercel)

**Status:** ✅ **PASS**

`vercel.json` includes:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`

### 6.2 API Versioning

**Status:** ✅ **PASS**

- Routes support `/api/v1/` prefix
- Deprecation headers for unversioned routes
- Backward compatibility maintained

### 6.3 Build Security

**Status:** ✅ **PASS**

Production build blocks DEV_AUTH_BYPASS:
```typescript
if (isVercelProd && process.env.DEV_AUTH_BYPASS === 'true') {
  throw new Error('SECURITY VIOLATION: DEV_AUTH_BYPASS cannot be enabled in production');
}
```

---

## 7. Remediation Summary

### Critical (Fix Before Production)

| Priority | Issue | Action | Effort |
|----------|-------|--------|--------|
| P1 | Console logging of PII | Remove/sanitize auth callback logs | 30 min |
| P1 | CORS wildcard in Edge Functions | Restrict to known origins | 1 hour |
| P2 | npm audit high vulnerabilities | Update dependencies | 2 hours |
| P2 | PII field encryption | Document or implement encryption | 4 hours |

### Recommended (Post-Launch)

| Priority | Issue | Action | Effort |
|----------|-------|--------|--------|
| P3 | Structured logging | Implement PII-redacting logger | 4 hours |
| P3 | Security monitoring | Add failed auth alerting | 2 hours |
| P3 | Dependency scanning | Add Snyk/Dependabot to CI | 1 hour |

---

## 8. Accepted Risks

| Risk | Rationale | Mitigation |
|------|-----------|------------|
| minimatch ReDoS | Only affects dev dependencies | Monitor upstream fixes |
| Edge Function CORS | Internal functions only | Restrict origins before public API |
| PII in database | Supabase manages at-rest encryption | Document compliance posture |

---

## 9. Compliance Notes

- **SOC 2 Type II:** Claimed on marketing site - verify with actual certification
- **Data Retention:** No documented retention policy found
- **GDPR:** Right to deletion requires cascading deletes across 14 tables
- **Audit Logging:** Activities table tracks user/agent actions

---

## Appendix: Files Reviewed

### Core Security Files
- `src/middleware.ts` - Authentication, CSRF, rate limiting
- `src/lib/api/auth.ts` - API authentication
- `src/lib/rbac/` - Role-based access control
- `src/lib/middleware/csrf.ts` - CSRF protection
- `src/lib/middleware/rate-limit.ts` - Rate limiting
- `src/lib/supabase/service-role.ts` - Service client
- `src/lib/auth/tenant-context.ts` - Tenant context

### Configuration
- `next.config.ts` - CSP, security headers
- `vercel.json` - Deployment config
- `.env.example` - Environment documentation

### Database
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/020_rbac_enhancements.sql`
- `supabase/migrations/012_edge_function_helpers.sql`

### Edge Functions
- `supabase/functions/_shared/utils.ts`
- `supabase/functions/agent-execute/index.ts`

---

**Report Generated By:** ENG-BE Security Audit  
**Approved For:** Production Deployment (with P1 remediation)  
**Next Review:** 30 days post-launch

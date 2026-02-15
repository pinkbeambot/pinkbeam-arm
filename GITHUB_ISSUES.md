# GitHub Issues to Create - ARM Platform Audit

This document contains the GitHub issues that should be created based on the comprehensive audit findings.

---

## 🔒 SECURITY ISSUES

### Issue 1: [SECURITY-P1] API Key Exposure Risk in Agent Config Test Route
```
Title: 🔒 [SECURITY] API Key Potential Exposure in Agent Config Test Route
Labels: security, high-priority, api
Body:
## Description
The `/api/agents/[id]/config/test` route accesses `CLAUDE_API_KEY` environment variable. While server-side only, there's potential for SSRF or proxy attacks if the endpoint is abused.

## Location
File: `src/app/api/agents/[id]/config/test/route.ts`

## Risk
- Potential API key exposure through SSRF
- Unauthorized proxy usage
- Rate limit abuse on Claude API

## Recommendation
- [ ] Add strict rate limiting (5 tests/minute per tenant)
- [ ] Validate test configuration doesn't expose internal networks
- [ ] Log all test attempts for audit purposes
- [ ] Add request timeout and size limits
- [ ] Consider sandboxing test execution

## Acceptance Criteria
- [ ] Rate limiting middleware applied to route
- [ ] Network validation prevents internal IP access
- [ ] Audit logging implemented
- [ ] Security tests added to verify protections
```

### Issue 2: [SECURITY-P2] Missing Input Sanitization on Search Queries
```
Title: 🔒 [SECURITY] Improve Input Sanitization on Search Queries
Labels: security, medium-priority, input-validation
Body:
## Description
The `escapeIlike()` function only escapes `%`, `_`, and `\` characters but doesn't handle other potential injection vectors.

## Current Code
```typescript
export function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&');
}
```

## Recommendation
- [ ] Add maximum length validation (200 chars)
- [ ] Strip HTML tags from search terms
- [ ] Add test cases for edge case inputs
- [ ] Consider using parameterized queries exclusively

## Acceptance Criteria
- [ ] Length limits enforced
- [ ] HTML stripping implemented
- [ ] Unit tests for sanitization function
```

### Issue 3: [SECURITY-P2] Error Message Information Leakage
```
Title: 🔒 [SECURITY] Error Messages Expose Database Details
Labels: security, medium-priority, api
Body:
## Description
Some API routes return detailed database error messages to clients, potentially exposing schema information.

## Examples
- `src/app/api/escalations/[id]/route.ts:45`: Returns `fetchError.message` directly

## Recommendation
- [ ] Return generic error messages to clients
- [ ] Log detailed errors server-side only
- [ ] Use error codes that map to safe messages
- [ ] Audit all API routes for this pattern

## Acceptance Criteria
- [ ] All API routes return safe error messages
- [ ] Error codes documented
- [ ] Server-side logging implemented
```

---

## 🐛 BUGS

### Issue 4: [BUG-P1] E2E Tests Rely on Dev Auth Bypass
```
Title: 🐛 [BUG] E2E Test Fixture Relies on Dev Auth Bypass
Labels: bug, high-priority, testing, auth
Body:
## Description
E2E tests rely on `DEV_AUTH_BYPASS=true` which bypasses all authentication. This doesn't test real auth flows and could mask auth-related bugs.

## Current Code
```typescript
export async function loginWithBypass(page: Page): Promise<void> {
  await page.goto('/portal');
  await page.waitForLoadState('networkidle');
}
```

## Impact
- Auth flows not actually tested
- Potential security regressions undetected
- Magic link flow untested

## Recommendation
- [ ] Implement test-specific auth provider
- [ ] Use mock Supabase auth for E2E tests
- [ ] Add at least one E2E test with real auth flow
- [ ] Document auth testing strategy

## Acceptance Criteria
- [ ] E2E tests can run with real authentication
- [ ] Mock auth available for faster tests
- [ ] Magic link flow tested
- [ ] Auth error states tested
```

### Issue 5: [BUG-P1] Race Condition in Task Dependencies Verification
```
Title: 🐛 [BUG] Verify Race Condition Fix in Task Dependencies
Labels: bug, high-priority, database, concurrency
Body:
## Description
Migration 025 indicates a race condition was found in task dependency auto-unblocking. The fix uses advisory locks but needs verification.

## Related File
- `supabase/migrations/025_fix_task_dependency_race_condition.sql`

## Recommendation
- [ ] Add integration tests for concurrent task completion
- [ ] Monitor for deadlocks in production
- [ ] Consider using Supabase Realtime for dependency updates
- [ ] Document concurrency behavior

## Acceptance Criteria
- [ ] Integration tests for concurrent operations
- [ ] Load testing for task completion
- [ ] Deadlock monitoring alerts
- [ ] Documentation updated
```

### Issue 6: [BUG-P2] Activity Feed Auto-scroll Not Implemented
```
Title: 🐛 [BUG] Activity Feed Auto-scroll Not Enabled
Labels: bug, medium-priority, ui, realtime
Body:
## Description
PRD specifies auto-scrolling activity feed with pause/resume, but implementation shows `autoScroll={false}` hardcoded.

## Current Code
```tsx
<ActivityFeed
  maxHeight="600px"
  showFilters={false}
  autoScroll={false}  // Should be true per PRD
/>
```

## Recommendation
- [ ] Enable auto-scroll by default
- [ ] Implement pause on hover/scroll
- [ ] Add resume scroll button
- [ ] Add "new events" indicator

## Acceptance Criteria
- [ ] Auto-scroll works correctly
- [ ] Pause/resume functionality implemented
- [ ] Visual indicator for new events
- [ ] Accessibility: keyboard controls
```

### Issue 7: [BUG-P2] Kanban Drag-and-Drop Missing Accessibility
```
Title: 🐛 [BUG] Kanban Board Missing Keyboard Accessibility
Labels: bug, medium-priority, accessibility, a11y
Body:
## Description
Drag-and-drop implemented with @dnd-kit but missing keyboard controls and screen reader announcements.

## Recommendation
- [ ] Add keyboard handlers (arrow keys to move, space to pick up/drop)
- [ ] Add ARIA live regions for drag announcements
- [ ] Ensure focus management during drag operations
- [ ] Test with screen readers

## Acceptance Criteria
- [ ] Full keyboard navigation works
- [ ] Screen reader announces drag operations
- [ ] Focus visible and managed correctly
- [ ] WCAG 2.1 AA compliant
```

---

## 📋 PRD GAPS

### Issue 8: [PRD-GAP-P1] Real-time Updates Not Fully Implemented
```
Title: 📋 [PRD-GAP] Real-time Updates for Activity Feed
Labels: enhancement, high-priority, realtime, prd-gap
Body:
## Description
PRD requires: "Events update in real-time via WebSocket (no page refresh)"
Current: Activity feed uses polling, not Supabase Realtime

## Current State
- Realtime infrastructure exists in `src/lib/realtime/`
- Minimal integration in components
- ActivityFeed component uses polling

## Recommendation
- [ ] Integrate Supabase Realtime subscriptions
- [ ] Update ActivityFeed to use Realtime
- [ ] Handle connection errors gracefully
- [ ] Add reconnection logic

## Acceptance Criteria
- [ ] Activity events appear in real-time
- [ ] No page refresh required
- [ ] Connection status visible to user
- [ ] Graceful degradation when offline
```

### Issue 9: [PRD-GAP-P1] Agent Marketplace UI Incomplete
```
Title: 📋 [PRD-GAP] Agent Marketplace/Template Library UI
Labels: enhancement, high-priority, agents, prd-gap
Body:
## Description
PRD requires: "Template library with pre-written role descriptions"
Current: Templates exist in DB but no UI for browsing/sharing

## Current State
- `agent_templates` table exists
- Templates used in agent creation
- No marketplace UI for browsing all templates

## Recommendation
- [ ] Create marketplace browse page
- [ ] Add template categories/filtering
- [ ] Allow users to save custom templates
- [ ] Template preview functionality

## Acceptance Criteria
- [ ] Browse all available templates
- [ ] Filter by category/use case
- [ ] Preview template configuration
- [ ] Save custom templates
```

### Issue 10: [PRD-GAP-P1] RBAC Not Enforced in UI
```
Title: 📋 [PRD-GAP] Role-Based Access Control (RBAC) UI Enforcement
Labels: enhancement, high-priority, auth, prd-gap
Body:
## Description
PRD defines roles: owner, admin, member, viewer
Current: Roles defined in types but not enforced in UI

## Current State
- User roles stored in database
- All users see all features
- No UI restrictions based on role

## Recommendation
- [ ] Add role-based feature flags
- [ ] Hide/show UI elements by role
- [ ] Add role management UI for owners
- [ ] API route role validation

## Acceptance Criteria
- [ ] Viewers: read-only access
- [ ] Members: limited write access
- [ ] Admins: full access except billing
- [ ] Owners: full access including billing
```

### Issue 11: [PRD-GAP-P1] Email Notifications System
```
Title: 📋 [PRD-GAP] Email Notification System
Labels: enhancement, high-priority, notifications, prd-gap
Body:
## Description
PRD requires: "Email notification option for when offline"
Current: Resend integration exists but notification preferences incomplete

## Current State
- Resend client configured
- `notification_settings` in user schema
- No email templates or sending logic

## Recommendation
- [ ] Create email templates for escalations
- [ ] Daily digest email option
- [ ] Immediate notifications for critical events
- [ ] Email preference management UI

## Acceptance Criteria
- [ ] Escalation notification emails
- [ ] Daily digest option
- [ ] Unsubscribe functionality
- [ ] Email templates match brand
```

### Issue 12: [PRD-GAP-P1] Advanced Analytics Dashboard
```
Title: 📋 [PRD-GAP] Advanced Analytics and ROI Dashboard
Labels: enhancement, high-priority, analytics, prd-gap
Body:
## Description
PRD requires: "ROI metrics, bottleneck identification, performance leaderboard"
Current: Basic metrics exist but advanced analytics missing

## Current State
- Basic dashboard stats implemented
- Agent performance partially tracked
- No comparative analytics

## Recommendation
- [ ] ROI calculation engine
- [ ] Bottleneck identification algorithm
- [ ] Performance trend charts
- [ ] Comparative agent analytics
- [ ] Exportable reports

## Acceptance Criteria
- [ ] ROI metrics visible
- [ ] Bottleneck alerts
- [ ] Performance comparisons
- [ ] Trend analysis charts
- [ ] CSV/PDF export
```

---

## 🔧 TECHNICAL DEBT

### Issue 13: [TECH-DEBT-P1] Replace TypeScript `any` Types
```
Title: 🔧 [TECH-DEBT] Replace TypeScript `any` Types with Strict Types
Labels: tech-debt, high-priority, typescript
Body:
## Description
Multiple instances of `any` types reduce type safety across the codebase.

## Examples
- `src/lib/database.ts`: Json type too permissive
- Various API route responses

## Recommendation
- [ ] Replace with strict types
- [ ] Use `unknown` with type guards where necessary
- [ ] Add eslint rule: `@typescript-eslint/no-explicit-any`
- [ ] Gradual migration plan

## Acceptance Criteria
- [ ] ESLint rule enabled
- [ ] Critical paths typed
- [ ] No new `any` types introduced
```

### Issue 14: [TECH-DEBT-P1] Standardize API Response Formats
```
Title: 🔧 [TECH-DEBT] Standardize API Response Wrapper Patterns
Labels: tech-debt, high-priority, api
Body:
## Description
Inconsistent response wrapper patterns across API routes

## Examples
```typescript
// Some routes return:
{ data: agent }
// Others return:
{ data: agents, pagination: {...} }
// Others return:
agents // unwrapped
```

## Recommendation
- [ ] Standardize on `{ data, meta?, pagination? }` pattern
- [ ] Create response utility functions
- [ ] Update all API routes
- [ ] Document API response format

## Acceptance Criteria
- [ ] All routes use standardized format
- [ ] Utility functions created
- [ ] API documentation updated
```

### Issue 15: [TECH-DEBT-P1] Add Database Connection Pooling
```
Title: 🔧 [TECH-DEBT] Implement Database Connection Pooling
Labels: tech-debt, high-priority, performance, database
Body:
## Description
Each request creates new Supabase client without connection pooling

## Location
- `src/lib/supabase/server.ts`

## Recommendation
- [ ] Implement connection pooling for server-side clients
- [ ] Monitor for connection exhaustion
- [ ] Add connection metrics

## Acceptance Criteria
- [ ] Connection pooling implemented
- [ ] Metrics dashboard showing connections
- [ ] Load test passed
```

### Issue 16: [TECH-DEBT-P2] Review and Remove Unused Dependencies
```
Title: 🔧 [TECH-DEBT] Review and Remove Unused Dependencies
Labels: tech-debt, medium-priority, dependencies
Body:
## Description
Potential unused dependencies increase bundle size

## Candidates
- `@supabase/auth-helpers-nextjs` (deprecated)
- `swagger-ui-react` (dev only?)
- Duplicate date libraries

## Recommendation
- [ ] Audit dependencies with `depcheck`
- [ ] Remove unused packages
- [ ] Move dev-only packages to devDependencies
- [ ] Document required peer dependencies

## Acceptance Criteria
- [ ] Bundle size reduced
- [ ] No unused dependencies
- [ ] Build passes
```

### Issue 17: [TECH-DEBT-P2] Refactor Large Components
```
Title: 🔧 [TECH-DEBT] Refactor Oversized Components
Labels: tech-debt, medium-priority, refactoring
Body:
## Description
Components exceed recommended size (max 300 lines)

## Files
- `src/components/chat/ChatPanel.tsx` (30KB)
- `src/components/dashboard/tasks/TaskDetailModal.tsx` (17KB)

## Recommendation
- [ ] Extract sub-components
- [ ] Use composition patterns
- [ ] Split business logic into hooks
- [ ] Add component size linting

## Acceptance Criteria
- [ ] No component > 300 lines
- [ ] Hooks extracted for reusable logic
- [ ] Tests pass
```

### Issue 18: [TECH-DEBT-P2] Add API Versioning
```
Title: 🔧 [TECH-DEBT] Implement API Versioning Strategy
Labels: tech-debt, medium-priority, api, architecture
Body:
## Description
API routes don't include version prefix, making breaking changes difficult

## Current
`/api/agents`

## Recommended
`/api/v1/agents`

## Recommendation
- [ ] Add v1 prefix to all routes
- [ ] Create versioning strategy document
- [ ] Plan for v2 migration path
- [ ] Update API documentation

## Acceptance Criteria
- [ ] All routes versioned
- [ ] Versioning strategy documented
- [ ] Backwards compatibility maintained
```

---

## Summary

**Total Issues:** 18
- 🔒 Security: 3
- 🐛 Bugs: 4
- 📋 PRD Gaps: 5
- 🔧 Tech Debt: 6

**Priority Breakdown:**
- P1 (High): 11 issues
- P2 (Medium): 7 issues

**Recommended Sprint Allocation:**
- Sprint 1: Security issues + Critical bugs (5 issues)
- Sprint 2: PRD Gap P1 items (5 issues)
- Sprint 3: Tech Debt P1 items (3 issues)
- Sprint 4: Remaining P2 items (5 issues)

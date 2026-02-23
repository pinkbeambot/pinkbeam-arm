---
title: "Testing Standards"
type: process
status: active
created: 2026-02-13
updated: 2026-02-15
owner: CTO
tags: [testing, process, critical]
aliases: ["Testing", "Test Standards"]
---

# Pink Beam ARM — Testing Standards

**Status:** Enforced Standard  
**Effective:** 2026-02-13  
**Applies to:** All engineers (ENG-BE, ENG-FE, ENG-UX, ENG-INFRA)

---

## 1. Testing Philosophy

**"No code without tests. No merge without coverage."**

Every feature, bugfix, and refactor must include appropriate tests. Testing is not optional — it's part of the definition of done.

---

## 2. Test Types & Requirements

### 2.1 Unit Tests (Vitest)
**Purpose:** Test individual functions, utilities, business logic in isolation

**Requirements:**
- All utility functions in `/src/lib/` must have unit tests
- All API route handlers must have unit tests (mocked DB/auth)
- All React hooks must have unit tests
- Test file naming: `[name].test.ts` or `[name].spec.ts`
- Location: `src/__tests__/unit/[module]/`

**Coverage:** 80% minimum for new code

**Example:**
```typescript
// src/lib/rate-limit.test.ts
import { describe, it, expect } from 'vitest';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  it('allows requests under limit', async () => {
    const result = await checkRateLimit('tenant-1', 100);
    expect(result.allowed).toBe(true);
  });

  it('blocks requests over limit', async () => {
    // Make 101 requests
    for (let i = 0; i < 101; i++) {
      await checkRateLimit('tenant-1', 100);
    }
    const result = await checkRateLimit('tenant-1', 100);
    expect(result.allowed).toBe(false);
  });
});
```

---

### 2.2 Integration Tests (Vitest)
**Purpose:** Test API endpoints with real database, mocked external services

**Requirements:**
- All `/api/*` routes must have integration tests
- Test full request/response cycle
- Use test database (Supabase local or test project)
- Clean up test data after each test
- Location: `src/__tests__/integration/[endpoint]/`

**Coverage:** 70% minimum for API routes

**Required Test Cases for Each API:**
- ✅ Happy path (valid input, authenticated)
- ❌ Invalid input (400 response)
- ❌ Unauthorized (401 response)
- ❌ Forbidden (403 response — wrong tenant)
- ❌ Not found (404 response)
- ❌ Rate limited (429 response)

**Example:**
```typescript
// src/__tests__/integration/agents.test.ts
describe('/api/agents', () => {
  it('creates agent with valid data', async () => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testToken}` },
      body: JSON.stringify({ name: 'Test Agent', role: 'SDR' })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Test Agent');
  });

  it('returns 401 without auth', async () => {
    const res = await fetch('/api/agents', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
```

---

### 2.3 Component Tests (Vitest + React Testing Library)
**Purpose:** Test React components in isolation

**Requirements:**
- All UI components in `/src/components/ui/` must have tests
- All page components must have tests
- Test user interactions (clicks, inputs, form submission)
- Mock API calls and external dependencies
- Location: `src/__tests__/components/[ComponentName].test.tsx`

**Coverage:** 60% minimum for components

**Required Tests:**
- Renders without crashing
- Displays correct data from props
- Handles user interactions correctly
- Shows loading states
- Shows error states
- Accessibility (basic axe checks)

---

### 2.4 E2E Tests (Playwright)
**Purpose:** Test complete user flows from browser perspective

**Requirements:**
- Critical user journeys must have E2E tests
- Location: `src/__tests__/e2e/[flow].spec.ts`

**Required E2E Flows:**
- Authentication (magic link login)
- Onboarding (signup → first agent)
- Core workflows (create task, view dashboard, check escalations)
- Payment flow (Stripe integration)

**Example:**
```typescript
// src/__tests__/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login with magic link', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button:has-text("Send Magic Link")');
  
  // Check for success message
  await expect(page.locator('text=Check your email')).toBeVisible();
  
  // Simulate email click (in real test, use test email service)
  await page.goto('/auth/callback?token=test-token');
  
  // Should redirect to portal
  await expect(page).toHaveURL('/portal');
});
```

---

### 2.5 Visual Regression Tests (Playwright)
**Purpose:** Catch unintended UI changes

**Requirements:**
- All marketing pages must have visual tests
- All portal pages must have visual tests
- Screenshots compared against baseline
- Location: `src/__tests__/visual/[page].spec.ts`

**Existing Coverage:**
- ✅ `/` (landing page)
- ✅ `/pricing`
- ✅ `/agents/employee/[slug]`

**Required Additions:**
- `/portal` (dashboard)
- `/portal/agents`
- `/portal/tasks`
- `/signup` and `/login`

---

### 2.6 Performance Tests (Lighthouse CI)
**Purpose:** Ensure performance standards

**Requirements:**
- All pages must pass Lighthouse CI
- Run on every PR
- Fail if scores drop below thresholds

**Thresholds:**
- Performance: 80+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

**Config:** `.lighthouserc.js`

---

## 3. Test Coverage Requirements

### Minimum Coverage by Code Type

| Code Type | Unit | Integration | Component | E2E |
|-----------|------|-------------|-----------|-----|
| API Routes (/api/*) | 80% | 70% | N/A | Key flows |
| React Components | N/A | N/A | 60% | Key flows |
| Utility Functions | 80% | N/A | N/A | N/A |
| Hooks | 70% | N/A | N/A | N/A |
| Critical Paths (auth, billing) | 90% | 80% | 80% | ✅ Required |

### Coverage Enforcement
- CI fails if coverage drops below threshold
- PRs cannot merge with failing coverage
- Exceptions require Richard approval

---

## 4. Test Data Management

### Database Tests
- Use isolated test database
- Clean up after each test (truncate tables)
- Seed with test fixtures before tests
- Never use production data in tests

### Fixtures Location
```
src/__tests__/fixtures/
├── users.json
├── agents.json
├── tasks.json
└── tenants.json
```

### Mock External Services
- Supabase Auth: Mock with test tokens
- Stripe: Use test mode + test webhooks
- LLM APIs: Mock responses
- Email: Use test inboxes (Mailpit/Mailhog)

---

## 5. CI/CD Integration

### Test Pipeline (on every PR)
1. **Lint** — ESLint, TypeScript check
2. **Unit Tests** — `npm run test:unit` (fail if <80% coverage)
3. **Integration Tests** — `npm run test:integration` (fail if <70% coverage)
4. **Component Tests** — `npm run test:components` (fail if <60% coverage)
5. **E2E Tests** — `npm run test:e2e` (critical flows only)
6. **Visual Tests** — `npm run test:visual` (fail on unexpected changes)
7. **Lighthouse** — Performance audit (fail if <80)
8. **Build** — `npm run build` (must pass)

### Test Commands
```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:components   # Component tests only
npm run test:e2e          # E2E tests only
npm run test:visual       # Visual regression tests
npm run test:coverage     # All tests with coverage report
```

---

## 6. Writing Good Tests

### Test Naming
- Describe what you're testing: `[action] should [expected result]`
- Example: `checkRateLimit should block requests over limit`

### Test Structure (AAA Pattern)
```typescript
it('should create agent with valid data', async () => {
  // Arrange
  const agentData = { name: 'Test', role: 'SDR' };
  
  // Act
  const result = await createAgent(agentData);
  
  // Assert
  expect(result.name).toBe('Test');
  expect(result.role).toBe('SDR');
});
```

### Best Practices
- One assertion per test (ideally)
- Mock external dependencies
- Test edge cases (empty input, max values, special chars)
- Clean up after tests
- Use descriptive test names
- Group related tests with `describe` blocks

---

## 7. Testing Checklist (for PRs)

Before submitting PR, verify:

- [ ] Unit tests written for new utilities/functions
- [ ] Integration tests written for new API routes
- [ ] Component tests written for new UI components
- [ ] E2E tests written for new critical flows
- [ ] All tests pass locally (`npm run test`)
- [ ] Coverage meets minimum thresholds
- [ ] No test failures in CI
- [ ] Visual tests pass (or snapshots updated intentionally)

---

## 8. Responsibility Matrix

| Role | Testing Responsibility |
|------|----------------------|
| **ENG-BE** | Unit tests for utilities, integration tests for APIs |
| **ENG-FE** | Component tests, visual tests, E2E tests |
| **ENG-UX** | Visual regression tests, accessibility tests |
| **ENG-INFRA** | CI/CD pipeline, test infrastructure |
| **CTO** | Review test coverage on PRs, enforce thresholds |
| **ENG-QA** | E2E test strategy, test plan review |

---

## 9. Enforcement

### PR Requirements
- PR template includes testing checklist
- CI enforces coverage thresholds
- CTO reviews coverage reports on all PRs
- No merge without passing tests

### Violations
- Missing tests → PR rejected
- Coverage below threshold → PR rejected
- Flaky tests → Must fix before merge
- No exceptions without Richard approval

---

## 10. Resources

### Documentation
- Vitest: https://vitest.dev/
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Playwright: https://playwright.dev/
- Lighthouse CI: https://github.com/GoogleChrome/lighthouse-ci

### Internal Examples
- `src/__tests__/unit/rate-limit.test.ts` — Good unit test example
- `src/__tests__/integration/agents.test.ts` — Good integration test example
- `src/__tests__/e2e/auth.spec.ts` — Good E2E test example

---

**This standard is non-negotiable.** All engineers must follow these testing requirements. CTO enforces on every PR.

---

## Related Documentation

- [[AGENT-ROLES]] — Role-specific testing enforcement
- [[E2E-TEST-PLAN]] — E2E test strategy and implementation plan
- [[DEVELOPMENT-PROCESS]] — Development process with testing ownership
- [[CICD]] — CI/CD pipeline executing test suite

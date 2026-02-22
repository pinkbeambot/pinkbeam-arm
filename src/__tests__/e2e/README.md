# E2E Tests for Pink Beam ARM

This directory contains end-to-end tests for the Pink Beam ARM platform using Playwright.

## Structure

```
src/__tests__/e2e/
├── auth.setup.ts     # Playwright setup project — authenticates via real OTP flow
├── fixtures.ts       # Test fixtures (authenticatedPage, cleanup)
├── index.ts          # Public exports
├── auth.spec.ts      # Authentication flows (unauthenticated + OTP login)
├── agents.spec.ts    # Agent management
├── tasks.spec.ts     # Task management
├── decisions.spec.ts # Decision log
└── README.md         # This file
```

## Test Coverage

### Authentication Flows (`auth.spec.ts`)
- ✅ Sign up / Sign in with OTP
- ✅ Login flow
- ✅ Logout
- ✅ Password reset
- ✅ Protected routes redirect
- ✅ Public routes accessible
- ✅ Auth callback error handling

### Agent Management (`agents.spec.ts`)
- ✅ Create agent from template
- ✅ Create custom agent from scratch
- ✅ Edit agent details
- ✅ Delete agent
- ✅ View agent details
- ✅ Filter by status and role
- ✅ Search agents
- ✅ Grid/list view toggle
- ✅ Sort agents
- ✅ View agent configuration page

### Task Management (`tasks.spec.ts`)
- ✅ Create task
- ✅ Edit task
- ✅ Delete task
- ✅ Move task in kanban (drag & drop)
- ✅ View task details
- ✅ Filter by status, priority, assignee
- ✅ Search tasks
- ✅ Sort tasks
- ✅ Set task priority
- ✅ Set due date
- ✅ Assign to agent
- ✅ Kanban column counts

### Navigation (`navigation.spec.ts`)
- ✅ All sidebar links work
- ✅ Active page highlighting
- ✅ Breadcrumbs on all pages
- ✅ Mobile navigation menu
- ✅ Mobile navigation drawer
- ✅ Header user menu
- ✅ Keyboard accessibility
- ✅ Theme toggle

### Critical Paths (`critical/user-journey.spec.ts`)
- ✅ Full user journey: signup → create agent → create task → complete
- ✅ Create, edit, delete agent flow
- ✅ Create, edit, move, delete task flow
- ✅ Logout and re-login
- ✅ Error handling (404, network errors)

## Running Tests

### Run all E2E tests (Chromium)
```bash
npm run test:e2e
```

### Run all E2E tests (all browsers)
```bash
npx playwright test --project=e2e-chromium --project=e2e-firefox --project=e2e-webkit
```

### Run mobile viewport tests
```bash
npx playwright test --project=e2e-mobile-chrome --project=e2e-mobile-safari
```

### Run critical path tests
```bash
npx playwright test --project=critical-chromium
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run with UI mode (for debugging)
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test
```bash
npx playwright test --grep "user can create agent"
```

### Debug a test
```bash
npx playwright test --debug
```

## Configuration

Tests use the following configuration from `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Desktop Viewport**: 1280x720
- **Mobile Viewports**: iPhone 14, Pixel 7
- **Dev Server**: Automatically started before tests
- **Screenshots**: Captured on failure
- **Video**: Recorded on failure
- **Traces**: Collected on first retry

## Authentication

Tests authenticate via the **real Supabase OTP flow** using Playwright's setup project
pattern. No `DEV_AUTH_BYPASS` is needed.

**How it works:**

1. The `setup` project (`auth.setup.ts`) runs before all E2E test projects
2. It navigates to `/auth`, enters an email, and retrieves a valid OTP via
   `supabase.auth.admin.generateLink()` (bypasses email delivery)
3. The OTP is entered in the browser, creating a real authenticated session
4. Session cookies are saved to `.playwright/.auth/user.json`
5. Test fixtures load this `storageState` into new browser contexts

**Required environment variables:**

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The persistent test user email is `e2e-test@pinkbeam-test.com` (created automatically
by the setup project if it doesn't exist).

## Test Data

Tests create their own test data (agents, tasks) during execution. Data is cleaned up
automatically where possible. Each test uses unique identifiers (timestamps) to avoid
conflicts.

Transient test users (created during journey tests) are cleaned up after test completion.

## Writing New Tests

1. Use the `authenticatedPage` fixture for tests requiring login:
```typescript
test('my test', async ({ authenticatedPage: page }) => {
  await page.goto('/portal/agents');
  // ... test code
});
```

2. Use `expect` from the fixtures for assertions:
```typescript
import { test, expect } from './fixtures';
```

3. Handle optional UI elements gracefully:
```typescript
const button = page.locator('button:has-text("Action")').first();
if (await button.isVisible().catch(() => false)) {
  await button.click();
}
```

4. Use test steps for complex flows:
```typescript
test('complex flow', async ({ page }) => {
  await test.step('Step 1: Create agent', async () => {
    // ...
  });
  await test.step('Step 2: Create task', async () => {
    // ...
  });
});
```

## Best Practices

- Use `.first()` when selecting elements to avoid strict mode violations
- Use `.catch(() => {})` for optional interactions
- Add `await page.waitForTimeout(500)` after actions that trigger async operations
- Use unique identifiers with `Date.now()` for test data
- Handle both populated and empty states gracefully
- Set appropriate timeouts for long-running tests: `test.setTimeout(120000)`
- Clean up test data in `test.step('Cleanup', async () => { ... })`

## CI/CD

Tests run automatically in CI with the following jobs:

1. **e2e-tests**: Desktop browsers (Chromium, Firefox, WebKit)
2. **e2e-tests-mobile**: Mobile viewports (Pixel 7, iPhone 14)
3. **critical-path-tests**: Critical user journeys

CI configuration:
- Retries: 2 attempts on failure
- Workers: 1 (serial execution)
- Screenshots: captured on failure
- Videos: recorded on failure
- Traces: collected on first retry
- Artifacts: uploaded for 30 days (7 days for screenshots)

## Test Count

- **Authentication**: 14 tests
- **Agent Management**: 15 tests
- **Task Management**: 17 tests
- **Decision Management**: 14 tests
- **Navigation**: 24 tests
- **Critical Paths**: 10 tests

**Total: 94+ E2E tests**

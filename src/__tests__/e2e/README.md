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

## Running Tests

### Run all E2E tests
```bash
npx playwright test --project=e2e-chromium
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run with UI mode (for debugging)
```bash
npx playwright test --ui --project=e2e-chromium
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed --project=e2e-chromium
```

### Run specific test
```bash
npx playwright test --grep "user can create agent"
```

## Configuration

Tests use the following configuration from `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium (desktop)
- **Viewport**: 1280x720
- **Dev Server**: Automatically started before tests

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

Tests create their own test data (agents, tasks) during execution. Data is cleaned up automatically where possible. Each test uses unique identifiers (timestamps) to avoid conflicts.

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

## Best Practices

- Use `.first()` when selecting elements to avoid strict mode violations
- Use `.catch(() => {})` for optional interactions
- Add `await page.waitForTimeout(500)` after actions that trigger async operations
- Use unique identifiers with `Date.now()` for test data
- Handle both populated and empty states gracefully

## CI/CD

Tests run automatically in CI with the following configuration:
- Retries: 2 attempts
- Workers: 1 (serial execution)
- Screenshots: captured on failure
- Traces: collected on first retry

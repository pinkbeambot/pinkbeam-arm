# E2E Tests for Pink Beam ARM

This directory contains end-to-end tests for the Pink Beam ARM platform using Playwright.

## Structure

```
src/__tests__/e2e/
├── fixtures.ts       # Test fixtures and authentication helpers
├── index.ts          # Public exports
├── auth.spec.ts      # Authentication flows
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

Tests use the `DEV_AUTH_BYPASS` feature for authentication. When `DEV_AUTH_BYPASS=true` is set in the environment, the middleware bypasses authentication checks.

For local development, set this in your `.env.local`:
```
DEV_AUTH_BYPASS=true
```

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

# E2E Testing Patterns for ARM Platform

## Overview

This document describes the E2E testing patterns and best practices for the ARM (Agent Relationship Management) platform using Playwright.

## Test Infrastructure

### File Structure

```
src/__tests__/e2e/
├── constants.ts           # Shared test constants
├── fixtures.ts            # Extended test fixtures with auth
├── auth.setup.ts          # Authentication setup project
├── auth.spec.ts           # Authentication flow tests
├── agents.spec.ts         # Agent management tests
├── tasks.spec.ts          # Task pipeline tests
├── decisions.spec.ts      # Decision log tests
├── navigation.spec.ts     # Navigation tests
├── critical/              # Critical path tests
│   └── user-journey.spec.ts
└── README.md              # This file
```

### Shared Constants

The `constants.ts` file exports shared values used across tests:

```typescript
export const TEST_EMAIL = 'e2e-test@pinkbeam-test.com';
export const STORAGE_STATE = '.playwright/.auth/user.json';
```

This avoids circular dependencies between test files and the auth setup.

### Test Fixtures

The `fixtures.ts` file provides an `authenticatedPage` fixture that automatically loads the auth state:

```typescript
import { test, expect } from './fixtures';

test('example', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/portal/agents');
  // Page is already authenticated
});
```

## Selector Patterns

### Preferred Selector Strategy

1. **data-testid attributes** (most reliable)
   ```typescript
   await page.click('[data-testid="create-agent-button"]');
   ```

2. **Role-based selectors** (accessible)
   ```typescript
   await page.getByRole('button', { name: 'Create Agent' }).click();
   ```

3. **Text-based selectors** (fallback)
   ```typescript
   await page.click('button:has-text("Create Agent")');
   ```

4. **CSS/ID selectors** (last resort)
   ```typescript
   await page.fill('input#name', 'Test Agent');
   ```

### Adding data-testid Attributes

When adding data-testid attributes to components, follow these conventions:

```typescript
// Component level
<div data-testid="agent-card" data-agent-id={agent.id}>

// Dialog/Modal level
<Dialog data-testid="create-agent-modal">

// Dynamic content
<div data-testid={`task-card-${task.id}`}>
```

## Test Patterns

### Authentication Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/auth');
  await page.getByLabel('Email address').fill(TEST_EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Enter your code')).toBeVisible();
});
```

### Authenticated Page Tests

```typescript
import { test, expect } from './fixtures';

test.describe('Agent Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/agents');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('user can view agents', async ({ authenticatedPage: page }) => {
    await expect(page.locator('h1:has-text("Agent Roster")')).toBeVisible();
  });
});
```

### Handling Dynamic Content

Always use `.catch()` for optional elements that may not exist:

```typescript
const filterButton = page.locator('[data-testid="status-filter"]').first();
if (await filterButton.isVisible().catch(() => false)) {
  await filterButton.click();
}
```

### Creating Test Data

```typescript
const agentName = `Test Agent ${Date.now()}`;
await page.fill('input[name="name"]', agentName);

// Verify creation
await expect(page.locator(`text=${agentName}`)).toBeVisible();
```

### Cleanup Patterns

For tests that create data, clean up after the test:

```typescript
test.afterEach(async ({ cleanup }) => {
  await cleanup();
});
```

## Critical Path Tests

The critical path tests in `critical/user-journey.spec.ts` cover:

1. **Full User Journey**: signup → create agent → create task → complete task
2. **Authentication**: logout and login again
3. **Error Handling**: 404 pages, network errors

These tests use longer timeouts (180s) and should be run in CI.

## Mobile Testing

Use browser contexts for mobile viewport testing:

```typescript
test('mobile menu works', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const page = await context.newPage();
  // Test mobile-specific features
  await context.close();
});
```

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// Good
test('user can create agent from template', async () => { ... });

// Bad
test('create agent', async () => { ... });
```

### 2. Group Related Tests

```typescript
test.describe('Navigation - Sidebar Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portal');
  });

  test('clicking Agents navigates to agents page', async () => { ... });
  test('clicking Tasks navigates to tasks page', async () => { ... });
});
```

### 3. Add Appropriate Timeouts

```typescript
test('slow operation', async () => {
  test.setTimeout(60000);
  // Test code
});
```

### 4. Use Step Groups for Long Tests

```typescript
await test.step('Create agent', async () => {
  await page.click('button:has-text("Create Agent")');
  await page.fill('input[name="name"]', agentName);
  await page.click('button:has-text("Create")');
});
```

### 5. Handle Flaky Operations

```typescript
// Add small delays after actions that trigger animations
await page.click('button');
await page.waitForTimeout(500);

// Wait for network to be idle
await page.waitForLoadState('networkidle');
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test agents.spec.ts

# Run setup only (create auth state)
npx playwright test --project=setup
```

## Environment Variables

Required for full test suite:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Troubleshooting

### Auth Setup Fails

1. Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Run setup project first: `npx playwright test --project=setup`
3. Check that the test user `e2e-test@pinkbeam-test.com` exists in Supabase

### Flaky Tests

1. Add `.catch(() => false)` for optional elements
2. Increase timeout: `test.setTimeout(60000)`
3. Add `await page.waitForTimeout(500)` after actions

### Selector Not Found

1. Check if the UI has changed
2. Add `data-testid` attribute to the component
3. Use more flexible selectors with fallback patterns

## Contributing

When adding new E2E tests:

1. Follow the existing file structure
2. Use the shared `fixtures.ts` for authenticated tests
3. Add `data-testid` attributes to new components
4. Update this documentation with new patterns
5. Run the full test suite before committing

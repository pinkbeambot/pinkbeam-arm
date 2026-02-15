# Playwright E2E Test Plan

## Current State
- ✅ Playwright configured for visual regression (`src/__tests__/visual/`)
- ❌ Missing functional E2E tests for user flows

## Proposed E2E Tests

### Critical User Flows (Issue #123)

1. **Auth Flow**
   ```typescript
   test('user can sign up with magic link', async ({ page }) => {
     await page.goto('/auth');
     await page.fill('[name="email"]', 'test@example.com');
     await page.click('text=Continue');
     await expect(page.locator('text=Check your email')).toBeVisible();
   });
   ```

2. **Agent Creation**
   ```typescript
   test('user can create agent', async ({ page }) => {
     await login(page); // helper
     await page.goto('/portal/agents');
     await page.click('text=Create Agent');
     await page.fill('[name="name"]', 'Test Agent');
     await page.click('text=Save');
     await expect(page.locator('text=Test Agent')).toBeVisible();
   });
   ```

3. **Task Pipeline**
   ```typescript
   test('user can create and move task', async ({ page }) => {
     await login(page);
     await page.goto('/portal/tasks');
     await page.click('text=Create Task');
     await page.fill('[name="title"]', 'Test Task');
     await page.click('text=Save');
     // Drag to In Progress
     // Verify status changed
   });
   ```

4. **Decision Flow**
   ```typescript
   test('user can view and override decision', async ({ page }) => {
     await login(page);
     await page.goto('/portal/decisions');
     await page.click('text=View');
     await page.click('text=Override');
     await expect(page.locator('text=Overridden')).toBeVisible();
   });
   ```

## Configuration Updates

### playwright.config.ts additions:
```typescript
// Add E2E test directory
export default defineConfig({
  testDir: './src/__tests__/e2e', // New E2E tests
  // Keep existing visual tests
  projects: [
    {
      name: 'e2e-chromium',
      testMatch: /e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // ... existing visual test projects
  ]
});
```

### Test Data Setup
```typescript
// src/__tests__/e2e/fixtures.ts
export const test = base.extend({
  // Auto-login fixture
  loggedInPage: async ({ page }, use) => {
     await login(page);
     await use(page);
  },
  
  // Test tenant with seed data
  testTenant: async ({}, use) => {
    const tenant = await createTestTenant();
    await use(tenant);
    await cleanupTestTenant(tenant.id);
  }
});
```

## File Structure

```
src/__tests__/
├── e2e/
│   ├── auth.spec.ts           # Signup/login
│   ├── agents.spec.ts         # Agent CRUD
│   ├── tasks.spec.ts          # Task pipeline
│   ├── decisions.spec.ts      # Decision log
│   └── fixtures.ts            # Helpers, auto-login
└── visual/                    # Existing visual tests
```

## CI Integration

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: |
    npm run dev &
    npx wait-on http://localhost:3000
    npx playwright test --project=e2e-chromium
```

## Benefits

1. **Catch regressions** — API changes break UI
2. **Documentation** — Tests show how features work
3. **Confidence** — Deploy knowing critical flows work
4. **Speed** — Faster than manual QA

## Priority

Start with:
1. Auth flow (most critical)
2. Agent creation (core feature)
3. Task creation (daily use)
4. Decisions (escalation path)

Want me to create Issue #123 and spawn engineers to implement?
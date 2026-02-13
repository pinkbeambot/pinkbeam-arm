# Visual Regression Testing

This project uses Playwright for visual regression testing of the marketing site.

## Running Tests

### Run all visual tests
```bash
npm run test:visual
```

### Update snapshots
```bash
npm run test:visual:update
```

### Run tests in headed mode (for debugging)
```bash
npx playwright test --headed
```

### Run tests for a specific file
```bash
npx playwright test landing.spec.ts
```

## Test Coverage

The following pages are tested:

- **Landing Page** (`/`)
  - Full page screenshot
  - Hero section
  - Navigation

- **Agents Page** (`/agents`)
  - Full page screenshot
  - Agents grid

- **Agent Detail Pages** (`/agents/employee/[slug]`)
  - All 6 agent pages (Sarah, Mike, Alex, Casey, LUMEN, FLUX)
  - Hero section for each

- **Pricing Page** (`/pricing`)
  - Full page screenshot
  - Pricing cards
  - FAQ section

## Configuration

Tests are configured in `playwright.config.ts`:
- Runs against Chromium desktop (1280x720) and mobile (iPhone 14)
- Screenshots are captured with a 0.2 threshold for acceptable differences
- Tests run against a production build (`npm run build && npm run start`)

## CI/CD

Visual regression tests run automatically on:
- Every PR to `main`
- Every push to `main`

Results are uploaded as artifacts in GitHub Actions.

## Writing New Tests

```typescript
import { test, expect } from '@playwright/test';

test('matches screenshot', async ({ page }) => {
  await page.goto('/your-page');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Wait for animations
  
  await expect(page).toHaveScreenshot('your-page.png', {
    fullPage: true,
    threshold: 0.2
  });
});
```

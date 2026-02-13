import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for the agents roster page
 */

test.describe('Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('matches screenshot - full page', async ({ page }) => {
    await expect(page).toHaveScreenshot('agents-page-full.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('matches screenshot - agents grid', async ({ page }) => {
    const grid = page.locator('section').nth(2);
    await expect(grid).toHaveScreenshot('agents-grid.png', {
      threshold: 0.2
    });
  });
});

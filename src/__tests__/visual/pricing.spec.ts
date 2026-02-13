import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for the pricing page
 */

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('matches screenshot - full page', async ({ page }) => {
    await expect(page).toHaveScreenshot('pricing-page-full.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('matches screenshot - pricing cards', async ({ page }) => {
    const cards = page.locator('section').nth(1);
    await expect(cards).toHaveScreenshot('pricing-cards.png', {
      threshold: 0.2
    });
  });

  test('matches screenshot - FAQ section', async ({ page }) => {
    const faq = page.locator('section').nth(2);
    await expect(faq).toHaveScreenshot('pricing-faq.png', {
      threshold: 0.2
    });
  });
});

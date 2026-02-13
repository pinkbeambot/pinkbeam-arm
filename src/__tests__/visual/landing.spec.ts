import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for the landing page
 * These tests capture screenshots and compare against baselines
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for fonts and animations to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('matches screenshot - full page', async ({ page }) => {
    await expect(page).toHaveScreenshot('landing-page-full.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('matches screenshot - hero section', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toHaveScreenshot('landing-hero.png', {
      threshold: 0.2
    });
  });

  test('matches screenshot - navigation', async ({ page }) => {
    const nav = page.locator('header');
    await expect(nav).toHaveScreenshot('landing-nav.png', {
      threshold: 0.2
    });
  });
});

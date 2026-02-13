import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for agent detail pages
 */

const agents = [
  { slug: 'researcher', name: 'Sarah' },
  { slug: 'sdr', name: 'Mike' },
  { slug: 'support', name: 'Alex' },
  { slug: 'content', name: 'Casey' },
  { slug: 'designer', name: 'LUMEN' },
  { slug: 'video', name: 'FLUX' },
];

test.describe('Agent Detail Pages', () => {
  for (const agent of agents) {
    test.describe(`${agent.name} page`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/agents/employee/${agent.slug}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      });

      test('matches screenshot', async ({ page }) => {
        await expect(page).toHaveScreenshot(`agent-${agent.slug}-full.png`, {
          fullPage: true,
          threshold: 0.2
        });
      });

      test('matches screenshot - hero', async ({ page }) => {
        const hero = page.locator('section').first();
        await expect(hero).toHaveScreenshot(`agent-${agent.slug}-hero.png`, {
          threshold: 0.2
        });
      });
    });
  }
});

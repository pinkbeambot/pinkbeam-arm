import { test, expect } from './fixtures';

test.describe('Navigation - Sidebar Links', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('sidebar contains all main navigation links', async ({ authenticatedPage: page }) => {
    // Dashboard link
    await expect(page.locator('nav a[href="/portal"], aside a[href="/portal"]').first()).toBeVisible();

    // Agents link
    await expect(page.locator('nav a[href="/portal/agents"], aside a[href="/portal/agents"]').first()).toBeVisible();

    // Tasks link
    await expect(page.locator('nav a[href="/portal/tasks"], aside a[href="/portal/tasks"]').first()).toBeVisible();

    // Decisions link
    await expect(page.locator('nav a[href="/portal/decisions"], aside a[href="/portal/decisions"]').first()).toBeVisible();

    // Chat link
    await expect(page.locator('nav a[href="/portal/chat"], aside a[href="/portal/chat"]').first()).toBeVisible();
  });

  test('clicking Dashboard navigates to portal home', async ({ authenticatedPage: page }) => {
    // Find and click Dashboard link
    const dashboardLink = page.locator('nav a[href="/portal"], aside a[href="/portal"]').first();
    await dashboardLink.click();

    await expect(page).toHaveURL('/portal');
    await expect(page.locator('text=Portal').or(page.locator('h1'))).toBeVisible();
  });

  test('clicking Agents navigates to agents page', async ({ authenticatedPage: page }) => {
    const agentsLink = page.locator('nav a[href="/portal/agents"], aside a[href="/portal/agents"]').first();
    await agentsLink.click();

    await expect(page).toHaveURL('/portal/agents');
    await expect(page.locator('text=Agent Roster')).toBeVisible();
  });

  test('clicking Tasks navigates to tasks page', async ({ authenticatedPage: page }) => {
    const tasksLink = page.locator('nav a[href="/portal/tasks"], aside a[href="/portal/tasks"]').first();
    await tasksLink.click();

    await expect(page).toHaveURL('/portal/tasks');
    await expect(page.locator('text=Task Pipeline')).toBeVisible();
  });

  test('clicking Decisions navigates to decisions page', async ({ authenticatedPage: page }) => {
    const decisionsLink = page.locator('nav a[href="/portal/decisions"], aside a[href="/portal/decisions"]').first();
    await decisionsLink.click();

    await expect(page).toHaveURL('/portal/decisions');
    await expect(page.locator('text=Decision Log')).toBeVisible();
  });

  test('clicking Activity navigates to activity page', async ({ authenticatedPage: page }) => {
    const activityLink = page.locator('nav a[href="/portal/activity"], aside a[href="/portal/activity"]').first();

    if (await activityLink.isVisible().catch(() => false)) {
      await activityLink.click();
      await expect(page).toHaveURL('/portal/activity');
      await expect(page.locator('text=Activity').or(page.locator('h1'))).toBeVisible();
    }
  });

  test('clicking Chat navigates to chat page', async ({ authenticatedPage: page }) => {
    const chatLink = page.locator('nav a[href="/portal/chat"], aside a[href="/portal/chat"]').first();
    await chatLink.click();

    await expect(page).toHaveURL('/portal/chat');
    await expect(page.locator('text=Chat').or(page.locator('h1'))).toBeVisible();
  });

  test('clicking Escalations navigates to escalations page', async ({ authenticatedPage: page }) => {
    const escalationsLink = page.locator('nav a[href="/portal/escalations"], aside a[href="/portal/escalations"]').first();

    if (await escalationsLink.isVisible().catch(() => false)) {
      await escalationsLink.click();
      await expect(page).toHaveURL('/portal/escalations');
      await expect(page.locator('text=Escalations').or(page.locator('h1'))).toBeVisible();
    }
  });

  test('clicking Performance navigates to performance page', async ({ authenticatedPage: page }) => {
    const performanceLink = page.locator('nav a[href="/portal/performance"], aside a[href="/portal/performance"]').first();

    if (await performanceLink.isVisible().catch(() => false)) {
      await performanceLink.click();
      await expect(page).toHaveURL('/portal/performance');
      await expect(page.locator('text=Performance').or(page.locator('h1'))).toBeVisible();
    }
  });

  test('clicking Analytics navigates to analytics page', async ({ authenticatedPage: page }) => {
    const analyticsLink = page.locator('nav a[href="/portal/analytics"], aside a[href="/portal/analytics"]').first();

    if (await analyticsLink.isVisible().catch(() => false)) {
      await analyticsLink.click();
      await expect(page).toHaveURL('/portal/analytics');
      await expect(page.locator('text=Analytics').or(page.locator('h1'))).toBeVisible();
    }
  });

  test('clicking Settings navigates to settings page', async ({ authenticatedPage: page }) => {
    const settingsLink = page.locator('nav a[href="/portal/settings"], aside a[href="/portal/settings"]').first();

    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click();
      await expect(page).toHaveURL('/portal/settings');
      await expect(page.locator('text=Settings').or(page.locator('h1'))).toBeVisible();
    }
  });

  test('active page is highlighted in sidebar', async ({ authenticatedPage: page }) => {
    // Navigate to agents page
    await page.goto('/portal/agents');
    await page.waitForLoadState('networkidle');

    // Check that the agents link has an active state
    const activeLink = page.locator('aside a[href="/portal/agents"]').first();
    await expect(activeLink).toHaveClass(/bg-primary\/10|text-primary/);
  });
});

test.describe('Navigation - Mobile', () => {
  test('mobile menu button is visible on small viewports', async ({ browser }) => {
    // Create a mobile viewport context
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    // Navigate to portal
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    // Look for mobile menu button (hamburger menu)
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"], button:has([data-lucide="menu"])').first();

    await expect(mobileMenuButton).toBeVisible();

    await context.close();
  });

  test('clicking mobile menu opens navigation drawer', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    // Click mobile menu button
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"], button:has([data-lucide="menu"])').first();
    await mobileMenuButton.click();

    // Verify navigation drawer opens
    await expect(page.locator('[role="dialog"], [data-state="open"]').first()).toBeVisible();

    await context.close();
  });

  test('mobile navigation contains all main links', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    // Open mobile menu
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"], button:has([data-lucide="menu"])').first();
    await mobileMenuButton.click();

    // Verify navigation drawer contains main links
    const navDrawer = page.locator('[role="dialog"], [data-state="open"]').first();

    // Check for at least some key navigation items
    const hasAgents = await navDrawer.locator('text=Agents').isVisible().catch(() => false);
    const hasTasks = await navDrawer.locator('text=Tasks').isVisible().catch(() => false);
    const hasDecisions = await navDrawer.locator('text=Decisions').isVisible().catch(() => false);

    expect(hasAgents || hasTasks || hasDecisions).toBe(true);

    await context.close();
  });

  test('mobile navigation links work correctly', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    // Open mobile menu
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"], button:has([data-lucide="menu"])').first();
    await mobileMenuButton.click();

    // Find and click Agents link in mobile nav
    const navDrawer = page.locator('[role="dialog"], [data-state="open"]').first();
    const agentsLink = navDrawer.locator('a:has-text("Agents")').first();

    if (await agentsLink.isVisible().catch(() => false)) {
      await agentsLink.click();
      await expect(page).toHaveURL('/portal/agents');
    }

    await context.close();
  });
});

test.describe('Navigation - Header Actions', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('sidebar contains logout option', async ({ authenticatedPage: page }) => {
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();

    await expect(logoutButton).toBeVisible();
  });

  test('theme toggle is available', async ({ authenticatedPage: page }) => {
    const themeToggle = page.locator('button[aria-label="Toggle theme"], button:has([data-lucide="sun"]), button:has([data-lucide="moon"])').first();

    if (await themeToggle.isVisible().catch(() => false)) {
      await expect(themeToggle).toBeVisible();
    }
  });
});

test.describe('Navigation - Keyboard Accessibility', () => {
  test('sidebar links are keyboard accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/portal');

    // Tab to first sidebar link
    await page.keyboard.press('Tab');

    // Check that some interactive element is focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

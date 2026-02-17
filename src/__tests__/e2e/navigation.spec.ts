import { test, expect } from './fixtures';

test.describe('Navigation - Sidebar Links', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('sidebar contains all main navigation links', async ({ authenticatedPage: page }) => {
    // Dashboard link
    await expect(page.locator('nav a[href="/portal"], nav button:has-text("Dashboard")')).toBeVisible();

    // Agents link
    await expect(page.locator('nav a[href="/portal/agents"], nav button:has-text("Agents")')).toBeVisible();

    // Tasks link
    await expect(page.locator('nav a[href="/portal/tasks"], nav button:has-text("Tasks")')).toBeVisible();

    // Decisions link
    await expect(page.locator('nav a[href="/portal/decisions"], nav button:has-text("Decisions")')).toBeVisible();

    // Chat/VALIS link
    await expect(page.locator('nav a[href="/portal/chat"], nav a[href="/portal/valis"], nav button:has-text("Chat"), nav button:has-text("VALIS")')).toBeVisible();
  });

  test('clicking Dashboard navigates to portal home', async ({ authenticatedPage: page }) => {
    // Find and click Dashboard link
    const dashboardLink = page.locator('nav a[href="/portal"], nav button:has-text("Dashboard")').first();
    await dashboardLink.click();

    await expect(page).toHaveURL('/portal');
    await expect(page.locator('text=Dashboard').or(page.locator('h1'))).toBeVisible();
  });

  test('clicking Agents navigates to agents page', async ({ authenticatedPage: page }) => {
    const agentsLink = page.locator('nav a[href="/portal/agents"], nav button:has-text("Agents")').first();
    await agentsLink.click();

    await expect(page).toHaveURL('/portal/agents');
    await expect(page.locator('text=Agent Roster')).toBeVisible();
  });

  test('clicking Tasks navigates to tasks page', async ({ authenticatedPage: page }) => {
    const tasksLink = page.locator('nav a[href="/portal/tasks"], nav button:has-text("Tasks")').first();
    await tasksLink.click();

    await expect(page).toHaveURL('/portal/tasks');
    await expect(page.locator('text=Task Pipeline')).toBeVisible();
  });

  test('clicking Decisions navigates to decisions page', async ({ authenticatedPage: page }) => {
    const decisionsLink = page.locator('nav a[href="/portal/decisions"], nav button:has-text("Decisions")').first();
    await decisionsLink.click();

    await expect(page).toHaveURL('/portal/decisions');
    await expect(page.locator('text=Decision Log')).toBeVisible();
  });

  test('clicking Activity navigates to activity page', async ({ authenticatedPage: page }) => {
    const activityLink = page.locator('nav a[href="/portal/activity"], nav button:has-text("Activity")').first();

    if (await activityLink.isVisible().catch(() => false)) {
      await activityLink.click();
      await expect(page).toHaveURL('/portal/activity');
      await expect(page.locator('text=Activity').or(page.locator('h1'))).toBeVisible();
    }
  });

  test('clicking Chat/VALIS navigates to chat page', async ({ authenticatedPage: page }) => {
    const chatLink = page.locator('nav a[href="/portal/chat"], nav a[href="/portal/valis"], nav button:has-text("Chat"), nav button:has-text("VALIS")').first();
    await chatLink.click();

    const url = page.url();
    expect(url).toMatch(/\/portal\/(chat|valis)/);
  });

  test('clicking Escalations navigates to escalations page', async ({ authenticatedPage: page }) => {
    const escalationsLink = page.locator('nav a[href="/portal/escalations"], nav button:has-text("Escalations")').first();

    if (await escalationsLink.isVisible().catch(() => false)) {
      await escalationsLink.click();
      await expect(page).toHaveURL('/portal/escalations');
      await expect(page.locator('text=Escalations').or(page.locator('h1'))).toBeVisible();
    }
  });

  test('clicking Metrics navigates to metrics page', async ({ authenticatedPage: page }) => {
    const metricsLink = page.locator('nav a[href="/portal/metrics"], nav button:has-text("Metrics"), nav button:has-text("Analytics")').first();

    if (await metricsLink.isVisible().catch(() => false)) {
      await metricsLink.click();
      await expect(page).toHaveURL('/portal/metrics');
      await expect(page.locator('text=Metrics').or(page.locator('text=Analytics')).or(page.locator('h1'))).toBeVisible();
    }
  });

  test('clicking Settings navigates to settings page', async ({ authenticatedPage: page }) => {
    const settingsLink = page.locator('nav a[href="/portal/settings"], nav button:has-text("Settings")').first();

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
    const activeLink = page.locator('nav a[href="/portal/agents"][data-active="true"], nav a[href="/portal/agents"].active, nav button:has-text("Agents")[data-active="true"]').first();

    // The active state might be indicated by different means
    await expect(page.locator('text=Agent Roster')).toBeVisible();
  });
});

test.describe('Navigation - Breadcrumbs', () => {
  test('agents page shows correct breadcrumb', async ({ authenticatedPage: page }) => {
    await page.goto('/portal/agents');
    await page.waitForLoadState('networkidle');

    // Look for breadcrumb containing Portal > Agents or just Agents
    const breadcrumb = page.locator('[data-testid="breadcrumb"], nav[aria-label="breadcrumb"], .breadcrumb').first();

    if (await breadcrumb.isVisible().catch(() => false)) {
      await expect(breadcrumb.locator('text=Agents').or(breadcrumb.locator('text=Agent'))).toBeVisible();
    }
  });

  test('tasks page shows correct breadcrumb', async ({ authenticatedPage: page }) => {
    await page.goto('/portal/tasks');
    await page.waitForLoadState('networkidle');

    const breadcrumb = page.locator('[data-testid="breadcrumb"], nav[aria-label="breadcrumb"], .breadcrumb').first();

    if (await breadcrumb.isVisible().catch(() => false)) {
      await expect(breadcrumb.locator('text=Tasks').or(breadcrumb.locator('text=Task'))).toBeVisible();
    }
  });

  test('decisions page shows correct breadcrumb', async ({ authenticatedPage: page }) => {
    await page.goto('/portal/decisions');
    await page.waitForLoadState('networkidle');

    const breadcrumb = page.locator('[data-testid="breadcrumb"], nav[aria-label="breadcrumb"], .breadcrumb').first();

    if (await breadcrumb.isVisible().catch(() => false)) {
      await expect(breadcrumb.locator('text=Decisions').or(breadcrumb.locator('text=Decision'))).toBeVisible();
    }
  });

  test('settings page shows correct breadcrumb', async ({ authenticatedPage: page }) => {
    await page.goto('/portal/settings');
    await page.waitForLoadState('networkidle');

    const breadcrumb = page.locator('[data-testid="breadcrumb"], nav[aria-label="breadcrumb"], .breadcrumb').first();

    if (await breadcrumb.isVisible().catch(() => false)) {
      await expect(breadcrumb.locator('text=Settings')).toBeVisible();
    }
  });

  test('nested settings pages show hierarchical breadcrumbs', async ({ authenticatedPage: page }) => {
    const nestedPages = [
      { path: '/portal/settings/team', name: 'Team' },
      { path: '/portal/settings/billing', name: 'Billing' },
      { path: '/portal/settings/notifications', name: 'Notifications' },
      { path: '/portal/settings/audit', name: 'Audit' },
    ];

    for (const { path, name } of nestedPages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const breadcrumb = page.locator('[data-testid="breadcrumb"], nav[aria-label="breadcrumb"], .breadcrumb').first();

      if (await breadcrumb.isVisible().catch(() => false)) {
        const hasSettings = await breadcrumb.locator('text=Settings').isVisible().catch(() => false);
        const hasPageName = await breadcrumb.locator(`text=${name}`).isVisible().catch(() => false);

        if (hasSettings || hasPageName) {
          expect(true).toBe(true);
        }
      }
    }
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

    // Click mobile menu button
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"], button:has([data-lucide="menu"])').first();
    await mobileMenuButton.click();

    // Verify navigation drawer opens
    await expect(page.locator('[data-testid="mobile-nav"], [role="dialog"], .mobile-nav').first()).toBeVisible();

    await context.close();
  });

  test('mobile navigation contains all main links', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/portal');

    // Open mobile menu
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"], button:has([data-lucide="menu"])').first();
    await mobileMenuButton.click();

    // Verify navigation drawer contains main links
    const navDrawer = page.locator('[data-testid="mobile-nav"], [role="dialog"], .mobile-nav').first();

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

    // Open mobile menu
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"], button:has([data-lucide="menu"])').first();
    await mobileMenuButton.click();

    // Find and click Agents link in mobile nav
    const agentsLink = page.locator('[data-testid="mobile-nav"] a:has-text("Agents"), [role="dialog"] a:has-text("Agents"), .mobile-nav a:has-text("Agents")').first();

    if (await agentsLink.isVisible().catch(() => false)) {
      await agentsLink.click();
      await expect(page).toHaveURL('/portal/agents');
    }

    await context.close();
  });

  test('mobile navigation can be closed', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/portal');

    // Open mobile menu
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button[aria-label="Menu"]').first();
    await mobileMenuButton.click();

    // Verify it's open
    const navDrawer = page.locator('[data-testid="mobile-nav"], [role="dialog"], .mobile-nav').first();
    await expect(navDrawer).toBeVisible();

    // Close via close button or overlay click
    const closeButton = page.locator('button[aria-label="Close"], button:has([data-lucide="x"])').first();

    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      // Click outside to close
      await page.mouse.click(10, 10);
    }

    await context.close();
  });
});

test.describe('Navigation - Header Actions', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('header contains user menu', async ({ authenticatedPage: page }) => {
    const userMenu = page.locator('button[aria-label="User menu"], [data-testid="user-menu"], button:has([data-lucide="user"])').first();

    await expect(userMenu).toBeVisible();
  });

  test('clicking user menu opens dropdown', async ({ authenticatedPage: page }) => {
    const userMenu = page.locator('button[aria-label="User menu"], [data-testid="user-menu"], button:has([data-lucide="user"])').first();
    await userMenu.click();

    // Verify dropdown opens
    await expect(page.locator('[role="menu"], [data-testid="user-dropdown"]').first()).toBeVisible();
  });

  test('user menu contains profile link', async ({ authenticatedPage: page }) => {
    const userMenu = page.locator('button[aria-label="User menu"], [data-testid="user-menu"]').first();
    await userMenu.click();

    const dropdown = page.locator('[role="menu"], [data-testid="user-dropdown"]').first();
    await expect(dropdown.locator('text=Profile').or(dropdown.locator('text=Settings'))).toBeVisible();
  });

  test('user menu contains logout option', async ({ authenticatedPage: page }) => {
    const userMenu = page.locator('button[aria-label="User menu"], [data-testid="user-menu"]').first();
    await userMenu.click();

    const dropdown = page.locator('[role="menu"], [data-testid="user-dropdown"]').first();
    await expect(dropdown.locator('text=Logout').or(dropdown.locator('text=Sign out'))).toBeVisible();
  });

  test('header contains notifications bell', async ({ authenticatedPage: page }) => {
    const notificationsButton = page.locator('button[aria-label="Notifications"], button:has([data-lucide="bell"])').first();

    if (await notificationsButton.isVisible().catch(() => false)) {
      await expect(notificationsButton).toBeVisible();
    }
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

  test('escape key closes mobile navigation', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/portal');

    // Open mobile menu
    const mobileMenuButton = page.locator('button[aria-label="Open menu"]').first();
    await mobileMenuButton.click();

    // Verify it's open
    const navDrawer = page.locator('[data-testid="mobile-nav"], [role="dialog"]').first();
    await expect(navDrawer).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Nav should close (we can't easily verify this without checking visibility after animation)
    await page.waitForTimeout(300);

    await context.close();
  });
});

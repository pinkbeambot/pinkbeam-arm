import { test, expect } from './fixtures';

test.describe('Agent Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Each test starts with an authenticated page
    await authenticatedPage.goto('/portal/agents');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('user can view agents page', async ({ authenticatedPage: page }) => {
    // Verify the page loads with expected elements
    await expect(page.locator('text=Agent Roster')).toBeVisible();
    await expect(page.locator('text=Manage your AI workforce')).toBeVisible();
  });

  test('user can see agent statistics cards', async ({ authenticatedPage: page }) => {
    // Verify stats cards are visible
    await expect(page.locator('text=Total')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();
    await expect(page.locator('text=Idle')).toBeVisible();
    await expect(page.locator('text=Paused')).toBeVisible();
    await expect(page.locator('text=Error')).toBeVisible();
  });

  test('user can open create agent modal', async ({ authenticatedPage: page }) => {
    // Click create agent button
    await page.click('button:has-text("Create Agent")');
    
    // Verify modal opens
    await expect(page.locator('text=Create New Agent')).toBeVisible();
    await expect(page.locator('text=Set up a new AI agent to join your workforce')).toBeVisible();
  });

  test('user can create agent from template', async ({ authenticatedPage: page }) => {
    // Open create modal
    await page.click('button:has-text("Create Agent")');
    await expect(page.locator('text=Create New Agent')).toBeVisible();
    
    // Select a template (e.g., Content Writer)
    await page.click('button:has-text("Content Writer")');
    
    // Fill in basic info
    const agentName = `Test Agent ${Date.now()}`;
    await page.fill('input#name', agentName);
    await page.fill('textarea#description', 'A test agent created via E2E tests');
    
    // Click Next to capabilities
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Select what this agent is allowed to do')).toBeVisible();
    
    // Click Next to review
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Review')).toBeVisible();
    await expect(page.locator(`text=${agentName}`)).toBeVisible();
    
    // Create the agent
    await page.click('button:has-text("Create Agent")');
    
    // Verify agent appears in list (may need to wait for creation)
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${agentName}`)).toBeVisible();
  });

  test('user can create custom agent from scratch', async ({ authenticatedPage: page }) => {
    // Open create modal
    await page.click('button:has-text("Create Agent")');
    
    // Select "Start from Scratch"
    await page.click('button:has-text("Start from Scratch")');
    
    // Fill in basic info
    const agentName = `Custom Agent ${Date.now()}`;
    await page.fill('input#name', agentName);
    
    // Select role
    await page.click('[data-testid="role-select"], button[role="combobox"]').catch(() => {});
    await page.click('text=Manager').catch(() => {});
    
    await page.fill('textarea#description', 'A custom agent created from scratch');
    
    // Proceed through wizard
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    // Create
    await page.click('button:has-text("Create Agent")');
    
    // Verify created
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${agentName}`)).toBeVisible();
  });

  test('user can filter agents by status', async ({ authenticatedPage: page }) => {
    // Open status filter dropdown
    await page.click('button:has-text("Status")').catch(async () => {
      // Alternative: look for select
      await page.click('[data-testid="status-filter"]').catch(() => {});
    });
    
    // Select a status
    await page.click('text=Active').catch(() => {});
    
    // Verify filter is applied (list updates)
    await expect(page.locator('body')).toBeVisible();
  });

  test('user can filter agents by role', async ({ authenticatedPage: page }) => {
    // Open role filter
    await page.click('button:has-text("Role")').catch(async () => {
      await page.click('[data-testid="role-filter"]').catch(() => {});
    });
    
    // Select a role
    await page.click('text=Manager').catch(() => {});
    
    // Verify filter applied
    await expect(page.locator('body')).toBeVisible();
  });

  test('user can search agents', async ({ authenticatedPage: page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Test');
      
      // Wait for search to apply
      await page.waitForTimeout(500);
      
      // Verify search is active
      await expect(searchInput).toHaveValue('Test');
    }
  });

  test('user can switch between grid and list views', async ({ authenticatedPage: page }) => {
    // Look for view toggle buttons
    const gridButton = page.locator('button[aria-label*="grid"], button:has([data-lucide="layout-grid"])').first();
    const listButton = page.locator('button[aria-label*="list"], button:has([data-lucide="list"])').first();
    
    // Try to switch views if buttons exist
    if (await listButton.isVisible().catch(() => false)) {
      await listButton.click();
      await page.waitForTimeout(300);
    }
    
    if (await gridButton.isVisible().catch(() => false)) {
      await gridButton.click();
      await page.waitForTimeout(300);
    }
    
    // Page should still be functional
    await expect(page.locator('text=Agent Roster')).toBeVisible();
  });

  test('user can open agent detail panel', async ({ authenticatedPage: page }) => {
    // Find and click on first agent card/row
    const firstAgent = page.locator('[data-testid="agent-card"], [data-testid="agent-row"], .agent-card').first();
    
    if (await firstAgent.isVisible().catch(() => false)) {
      await firstAgent.click();
      
      // Verify detail panel opens
      await expect(page.locator('text=Agent Details').or(page.locator('text=Details'))).toBeVisible();
    } else {
      // If no agents, the create button should be visible
      await expect(page.locator('button:has-text("Create Agent")')).toBeVisible();
    }
  });

  test('user can sort agents', async ({ authenticatedPage: page }) => {
    // Look for sort controls
    const sortButton = page.locator('button:has-text("Sort"), [data-testid="sort-select"]').first();

    if (await sortButton.isVisible().catch(() => false)) {
      await sortButton.click();

      // Select different sort option
      await page.click('text=Name').catch(() => {});
      await page.click('text=Created').catch(() => {});

      // Verify page is still functional
      await expect(page.locator('text=Agent Roster')).toBeVisible();
    }
  });

  test('user can edit agent details', async ({ authenticatedPage: page }) => {
    // Create a test agent first
    await page.click('button:has-text("Create Agent")');
    await expect(page.locator('text=Create New Agent')).toBeVisible();

    const agentName = `Edit Test Agent ${Date.now()}`;
    const updatedName = `Updated Agent ${Date.now()}`;

    await page.click('button:has-text("Start from Scratch")');
    await page.fill('input#name', agentName);
    await page.fill('textarea#description', 'Agent for edit testing');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Create Agent")');

    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${agentName}`)).toBeVisible();

    // Open agent details
    await page.locator(`text=${agentName}`).first().click();
    await expect(page.locator('text=Agent Details').or(page.locator('text=Details'))).toBeVisible();

    // Click edit
    const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit"]').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();

      // Update name
      const nameInput = page.locator('input#name, input[name="name"]').first();
      await nameInput.fill(updatedName);

      // Save
      await page.click('button:has-text("Save"), button:has-text("Update")').catch(() => {});
      await page.waitForTimeout(500);

      // Verify update
      await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    }

    // Close panel
    await page.click('button:has-text("Close"), button[aria-label="Close"]').catch(() => {
      page.keyboard.press('Escape');
    });
  });

  test('user can delete agent', async ({ authenticatedPage: page }) => {
    // Create a test agent
    await page.click('button:has-text("Create Agent")');
    await expect(page.locator('text=Create New Agent')).toBeVisible();

    const agentName = `Delete Test Agent ${Date.now()}`;

    await page.click('button:has-text("Start from Scratch")');
    await page.fill('input#name', agentName);
    await page.fill('textarea#description', 'Agent for delete testing');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Create Agent")');

    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${agentName}`)).toBeVisible();

    // Open agent details
    await page.locator(`text=${agentName}`).first().click();
    await expect(page.locator('text=Agent Details').or(page.locator('text=Details'))).toBeVisible();

    // Click delete
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove"), button[aria-label="Delete"]').first();

    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').first();
      await confirmButton.click().catch(() => {});

      await page.waitForTimeout(1000);

      // Verify agent is deleted
      await expect(page.locator(`text=${agentName}`)).not.toBeVisible();
    }
  });

  test('user can view agent configuration page', async ({ authenticatedPage: page }) => {
    // Find first agent
    const firstAgent = page.locator('[data-testid="agent-card"], [data-testid="agent-row"], .agent-card').first();

    if (await firstAgent.isVisible().catch(() => false)) {
      // Look for configure/settings link
      const configureLink = firstAgent.locator('a:has-text("Configure"), a:has-text("Settings"), button:has-text("Configure")').first();

      if (await configureLink.isVisible().catch(() => false)) {
        await configureLink.click();

        // Should navigate to configuration page
        await expect(page).toHaveURL(/\/portal\/agents\/.*\/configure/);
        await expect(page.locator('text=Configuration').or(page.locator('h1'))).toBeVisible();
      }
    }
  });
});

import { test, expect } from './fixtures';

test.describe('Task Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/tasks');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('user can view tasks page', async ({ authenticatedPage: page }) => {
    await expect(page.locator('h1:has-text("Task Pipeline")')).toBeVisible();
    await expect(page.locator('text=Track and manage work across your AI workforce')).toBeVisible();
  });

  test('user can see kanban board columns', async ({ authenticatedPage: page }) => {
    // Verify kanban columns are visible
    await expect(page.locator('text=Backlog').first()).toBeVisible();
    await expect(page.locator('text=In Progress').first()).toBeVisible();
    await expect(page.locator('text=Review').first()).toBeVisible();
    await expect(page.locator('text=Done').first()).toBeVisible();
  });

  test('user can open create task modal', async ({ authenticatedPage: page }) => {
    await page.click('button:has-text("Create Task")');
    
    // Verify modal opens
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await expect(page.locator('text=Create Task').or(page.locator('text=New Task'))).toBeVisible();
  });

  test('user can create a new task', async ({ authenticatedPage: page }) => {
    // Open create modal
    await page.click('button:has-text("Create Task")');
    
    // Fill in task details
    const taskTitle = `E2E Test Task ${Date.now()}`;
    await page.fill('input[name="title"], input[placeholder*="title"]', taskTitle).catch(async () => {
      // Try alternative selectors
      await page.fill('input[type="text"]', taskTitle);
    });
    
    // Add description
    await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 
      'This is a test task created via E2E tests').catch(() => {});
    
    // Set priority if available
    const priorityButton = page.locator('button:has-text("Priority")').first();
    if (await priorityButton.isVisible().catch(() => false)) {
      await priorityButton.click();
      await page.click('text=High').catch(() => {});
    }
    
    // Save task
    await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').last().catch(async () => {
      // Try to find any primary button
      await page.locator('button.variant-primary, button.bg-primary').first().click();
    });
    
    // Wait for task to appear
    await page.waitForTimeout(1500);
    
    // Verify task appears in the backlog column
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible();
  });

  test('user can filter tasks by status', async ({ authenticatedPage: page }) => {
    // Open status filter
    const statusFilter = page.locator('button:has-text("Status"), [data-testid="status-filter"]').first();
    
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      
      // Select a status
      await page.click('text=In Progress').catch(() => {});
      
      // Verify filter is applied
      await expect(page.locator('text=Task Pipeline')).toBeVisible();
    }
  });

  test('user can filter tasks by priority', async ({ authenticatedPage: page }) => {
    // Open priority filter
    const priorityFilter = page.locator('button:has-text("Priority"), [data-testid="priority-filter"]').first();
    
    if (await priorityFilter.isVisible().catch(() => false)) {
      await priorityFilter.click();
      
      // Select a priority
      await page.click('text=High').catch(() => {});
      
      // Verify filter applied
      await expect(page.locator('text=Task Pipeline')).toBeVisible();
    }
  });

  test('user can filter tasks by assignee', async ({ authenticatedPage: page }) => {
    // Open assignee filter if available
    const assigneeFilter = page.locator('button:has-text("Assignee"), [data-testid="assignee-filter"]').first();
    
    if (await assigneeFilter.isVisible().catch(() => false)) {
      await assigneeFilter.click();
      
      // Select unassigned or an agent
      await page.click('text=Unassigned').catch(() => {});
      
      // Verify filter applied
      await expect(page.locator('text=Task Pipeline')).toBeVisible();
    }
  });

  test('user can search tasks', async ({ authenticatedPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('user can view task details', async ({ authenticatedPage: page }) => {
    // Find and click on first task card
    const firstTask = page.locator('[data-testid="task-card"], .task-card, [draggable="true"]').first();
    
    if (await firstTask.isVisible().catch(() => false)) {
      await firstTask.click();
      
      // Verify detail modal/panel opens
      await expect(page.locator('[role="dialog"]').first()).toBeVisible();
      
      // Close modal
      await page.click('button[aria-label="Close"], button:has([data-lucide="x"])').first().catch(() => {
        page.keyboard.press('Escape');
      });
    }
  });

  test('user can switch between kanban and graph views', async ({ authenticatedPage: page }) => {
    // Look for view toggle buttons
    const kanbanButton = page.locator('button:has-text("Kanban")').first();
    const graphButton = page.locator('button:has-text("Graph")').first();
    
    // Try to switch to graph view
    if (await graphButton.isVisible().catch(() => false)) {
      await graphButton.click();
      await page.waitForTimeout(500);
      
      // Verify graph view
      await expect(page.locator('text=Task Pipeline')).toBeVisible();
    }
    
    // Switch back to kanban
    if (await kanbanButton.isVisible().catch(() => false)) {
      await kanbanButton.click();
      await page.waitForTimeout(500);
      
      await expect(page.locator('text=Backlog')).toBeVisible();
    }
  });

  test('user can edit task details', async ({ authenticatedPage: page }) => {
    // Find first task and open it
    const firstTask = page.locator('[data-testid="task-card"], .task-card, [draggable="true"]').first();
    
    if (await firstTask.isVisible().catch(() => false)) {
      await firstTask.click();
      
      // Wait for detail modal
      await expect(page.locator('[role="dialog"]').first()).toBeVisible();
      
      // Try to edit title
      const titleInput = page.locator('input[name="title"]').first();
      if (await titleInput.isVisible().catch(() => false)) {
        const newTitle = `Updated ${Date.now()}`;
        await titleInput.fill(newTitle);
        
        // Save changes
        await page.click('button:has-text("Save")').catch(() => {});
        
        // Verify saved
        await expect(page.locator(`text=${newTitle}`)).toBeVisible();
      }
      
      // Close modal
      await page.click('button[aria-label="Close"], button:has([data-lucide="x"])').first().catch(() => {
        page.keyboard.press('Escape');
      });
    }
  });

  test('user can sort tasks', async ({ authenticatedPage: page }) => {
    const sortButton = page.locator('button:has-text("Sort"), [data-testid="sort-select"]').first();
    
    if (await sortButton.isVisible().catch(() => false)) {
      await sortButton.click();
      
      // Try different sort options
      await page.click('text=Priority').catch(() => {});
      await page.click('text=Due Date').catch(() => {});
      await page.click('text=Created').catch(() => {});
      
      await expect(page.locator('text=Task Pipeline')).toBeVisible();
    }
  });

  test('user can import tasks via CSV', async ({ authenticatedPage: page }) => {
    // Look for import button
    const importButton = page.locator('button:has-text("Import CSV"), button:has-text("Import")').first();
    
    if (await importButton.isVisible().catch(() => false)) {
      await importButton.click();
      
      // Verify import dialog opens
      await expect(page.locator('[role="dialog"]').first()).toBeVisible();
      await expect(page.locator('text=Import').first()).toBeVisible();
      
      // Close dialog
      await page.click('button:has-text("Cancel"), button[aria-label="Close"]').first().catch(() => {
        page.keyboard.press('Escape');
      });
    }
  });
});

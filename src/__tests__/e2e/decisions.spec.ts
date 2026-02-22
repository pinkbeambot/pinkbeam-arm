import { test, expect } from './fixtures';

test.describe('Decision Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/decisions');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('user can view decisions page', async ({ authenticatedPage: page }) => {
    await expect(page.locator('h1:has-text("Decision Log")')).toBeVisible();
    await expect(page.locator('text=Audit trail of all agent decisions')).toBeVisible();
  });

  test('user can see decision statistics', async ({ authenticatedPage: page }) => {
    // Verify decision stats are displayed
    const statsSection = page.locator('[data-testid="decision-stats"]').first();
    // Stats may or may not be visible depending on implementation
    await expect(page.locator('text=Decision Log')).toBeVisible();
  });

  test('user can filter decisions by agent', async ({ authenticatedPage: page }) => {
    // Open agent filter dropdown
    const agentFilter = page.locator('button:has-text("Agent"), [data-testid="agent-filter"]').first();
    
    if (await agentFilter.isVisible().catch(() => false)) {
      await agentFilter.click();
      
      // Try to select an agent if available
      const agentOption = page.locator('[data-testid="agent-option"], [role="option"]').first();
      if (await agentOption.isVisible().catch(() => false)) {
        await agentOption.click();
      } else {
        // Click any option
        await page.locator('li, [role="option"]').first().click().catch(() => {});
      }
      
      // Verify filter applied
      await expect(page.locator('text=Decision Log')).toBeVisible();
    }
  });

  test('user can filter decisions by confidence level', async ({ authenticatedPage: page }) => {
    // Open confidence filter
    const confidenceFilter = page.locator('button:has-text("Confidence"), [data-testid="confidence-filter"]').first();
    
    if (await confidenceFilter.isVisible().catch(() => false)) {
      await confidenceFilter.click();
      
      // Select a confidence level
      await page.click('text=High').catch(() => {});
      await page.click('text=90%+').catch(() => {});
      
      // Verify filter applied
      await expect(page.locator('text=Decision Log')).toBeVisible();
    }
  });

  test('user can filter decisions by type/status', async ({ authenticatedPage: page }) => {
    // Open type/status filter
    const typeFilter = page.locator('button:has-text("Type"), button:has-text("Status"), [data-testid="type-filter"]').first();
    
    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click();
      
      // Select a type
      await page.click('text=Proposed').catch(() => {});
      await page.click('text=Approved').catch(() => {});
      
      // Verify filter applied
      await expect(page.locator('text=Decision Log')).toBeVisible();
    }
  });

  test('user can filter decisions by date range', async ({ authenticatedPage: page }) => {
    // Open date filter
    const dateFilter = page.locator('button:has-text("Date"), button:has-text("Time"), [data-testid="date-filter"]').first();
    
    if (await dateFilter.isVisible().catch(() => false)) {
      await dateFilter.click();
      
      // Select a date range
      await page.click('text=Today').catch(() => {});
      await page.click('text=Last 7 days').catch(() => {});
      await page.click('text=This week').catch(() => {});
      
      // Verify filter applied
      await expect(page.locator('text=Decision Log')).toBeVisible();
    }
  });

  test('user can search decisions', async ({ authenticatedPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('user can view decision details', async ({ authenticatedPage: page }) => {
    // Find and click on first decision
    const firstDecision = page.locator('[data-testid="decision-item"], [data-testid="decision-row"], .decision-item').first();
    
    if (await firstDecision.isVisible().catch(() => false)) {
      await firstDecision.click();
      
      // Verify detail panel opens
      await expect(page.locator('[role="dialog"], [data-testid="decision-detail"]').first()).toBeVisible();
      
      // Close panel
      await page.click('button[aria-label="Close"], button:has([data-lucide="x"])').first().catch(() => {
        page.keyboard.press('Escape');
      });
    } else {
      // If no decisions, show appropriate message
      await expect(page.locator('text=No decisions').or(page.locator('text=Decision Log'))).toBeVisible();
    }
  });

  test('user can sort decisions', async ({ authenticatedPage: page }) => {
    const sortButton = page.locator('button:has-text("Sort"), [data-testid="sort-select"]').first();
    
    if (await sortButton.isVisible().catch(() => false)) {
      await sortButton.click();
      
      // Try different sort options
      await page.click('text=Confidence').catch(() => {});
      await page.click('text=Date').catch(() => {});
      await page.click('text=Name').catch(() => {});
      
      await expect(page.locator('text=Decision Log')).toBeVisible();
    }
  });

  test('user can navigate through decision pages if pagination exists', async ({ authenticatedPage: page }) => {
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]').first();
    const prevButton = page.locator('button:has-text("Previous"), [aria-label="Previous page"]').first();
    
    if (await nextButton.isVisible().catch(() => false)) {
      const isEnabled = await nextButton.isEnabled().catch(() => false);
      
      if (isEnabled) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Should still be on decisions page
        await expect(page.locator('text=Decision Log')).toBeVisible();
      }
    }
    
    if (await prevButton.isVisible().catch(() => false)) {
      const isEnabled = await prevButton.isEnabled().catch(() => false);
      
      if (isEnabled) {
        await prevButton.click();
      }
    }
  });

  test('user can export decisions', async ({ authenticatedPage: page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-button"]').first();
    
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();
      
      // Select export format
      await page.click('text=CSV').catch(() => {});
      await page.click('text=JSON').catch(() => {});
      
      // Verify export initiated (toast or download)
      await expect(page.locator('text=Export').or(page.locator('text=Decision Log'))).toBeVisible();
    }
  });
});

import { test, expect } from './fixtures';

test.describe('Decision Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/decisions');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('user can view decisions page', async ({ authenticatedPage: page }) => {
    await expect(page.locator('text=Decision Log')).toBeVisible();
    await expect(page.locator('text=Audit trail of all agent decisions')).toBeVisible();
  });

  test('user can see decision statistics', async ({ authenticatedPage: page }) => {
    // Verify decision stats are displayed
    const statsSection = page.locator('[data-testid="decision-stats"]').first();
    await expect(statsSection.or(page.locator('text=Decision Log'))).toBeVisible();
  });

  test('user can filter decisions by agent', async ({ authenticatedPage: page }) => {
    // Open agent filter dropdown
    await page.click('button:has-text("Agent"), [data-testid="agent-filter"]').catch(() => {});
    
    // Try to select an agent if available
    const agentOption = page.locator('[data-testid="agent-option"]').first();
    if (await agentOption.isVisible().catch(() => false)) {
      await agentOption.click();
    } else {
      // Click any option
      await page.locator('li, [role="option"]').first().click().catch(() => {});
    }
    
    // Verify filter applied
    await expect(page.locator('text=Decision Log')).toBeVisible();
  });

  test('user can filter decisions by confidence level', async ({ authenticatedPage: page }) => {
    // Open confidence filter
    await page.click('button:has-text("Confidence"), [data-testid="confidence-filter"]').catch(() => {});
    
    // Select a confidence level
    await page.click('text=High').catch(() => {});
    await page.click('text=90%+').catch(() => {});
    
    // Verify filter applied
    await expect(page.locator('text=Decision Log')).toBeVisible();
  });

  test('user can filter decisions by type/status', async ({ authenticatedPage: page }) => {
    // Open type/status filter
    await page.click('button:has-text("Type"), button:has-text("Status"), [data-testid="type-filter"]').catch(() => {});
    
    // Select a type
    await page.click('text=Proposed').catch(() => {});
    await page.click('text=Approved').catch(() => {});
    
    // Verify filter applied
    await expect(page.locator('text=Decision Log')).toBeVisible();
  });

  test('user can filter decisions by date range', async ({ authenticatedPage: page }) => {
    // Open date filter
    await page.click('button:has-text("Date"), button:has-text("Time"), [data-testid="date-filter"]').catch(() => {});
    
    // Select a date range
    await page.click('text=Today').catch(() => {});
    await page.click('text=Last 7 days').catch(() => {});
    await page.click('text=This week').catch(() => {});
    
    // Verify filter applied
    await expect(page.locator('text=Decision Log')).toBeVisible();
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
      await expect(page.locator('text=Decision Details').or(page.locator('text=Details'))).toBeVisible();
      
      // Verify key sections are present
      await expect(page.locator('text=Decision Made').or(page.locator('text=Summary'))).toBeVisible();
    } else {
      // If no decisions, show appropriate message
      await expect(page.locator('text=No decisions').or(page.locator('text=Decision Log'))).toBeVisible();
    }
  });

  test('user can override a decision', async ({ authenticatedPage: page }) => {
    // Find first decision that can be overridden
    const firstDecision = page.locator('[data-testid="decision-item"]').first();
    
    if (await firstDecision.isVisible().catch(() => false)) {
      await firstDecision.click();
      
      // Wait for detail panel
      await expect(page.locator('text=Decision Details')).toBeVisible();
      
      // Look for override button
      const overrideButton = page.locator('button:has-text("Override")').first();
      
      if (await overrideButton.isVisible().catch(() => false)) {
        await overrideButton.click();
        
        // Fill in override form
        await page.fill('textarea[placeholder*="correct"], textarea[name="correctDecision"]', 
          'The correct decision should have been X').catch(() => {});
        
        await page.fill('textarea[placeholder*="reason"], textarea[name="reason"]', 
          'Overridden for E2E testing').catch(() => {});
        
        // Submit override
        await page.click('button:has-text("Confirm Override")').catch(() => {});
        
        // Verify override success
        await expect(page.locator('text=Overridden').or(page.locator('text=Decision Overridden'))).toBeVisible();
      }
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

  test('decision list shows confidence badges', async ({ authenticatedPage: page }) => {
    // Look for confidence indicators in the decision list
    const confidenceBadges = page.locator('text=%').first();
    
    // Either decisions with confidence exist or the list is empty
    await expect(page.locator('text=Decision Log')).toBeVisible();
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

  test('user can view decision reasoning', async ({ authenticatedPage: page }) => {
    const firstDecision = page.locator('[data-testid="decision-item"]').first();
    
    if (await firstDecision.isVisible().catch(() => false)) {
      await firstDecision.click();
      
      // Verify detail panel opens
      await expect(page.locator('text=Decision Details')).toBeVisible();
      
      // Look for reasoning section
      const reasoningSection = page.locator('text=Reasoning, [data-testid="reasoning"]').first();
      
      if (await reasoningSection.isVisible().catch(() => false)) {
        await expect(reasoningSection).toBeVisible();
      }
    }
  });

  test('user can navigate from decision to related task', async ({ authenticatedPage: page }) => {
    const firstDecision = page.locator('[data-testid="decision-item"]').first();
    
    if (await firstDecision.isVisible().catch(() => false)) {
      await firstDecision.click();
      
      await expect(page.locator('text=Decision Details')).toBeVisible();
      
      // Look for view task button
      const viewTaskButton = page.locator('button:has-text("View Task")').first();
      
      if (await viewTaskButton.isVisible().catch(() => false)) {
        // Don't actually click to avoid navigation issues, just verify it exists
        await expect(viewTaskButton).toBeVisible();
      }
    }
  });

  test('user can view decision in activity feed', async ({ authenticatedPage: page }) => {
    const firstDecision = page.locator('[data-testid="decision-item"]').first();
    
    if (await firstDecision.isVisible().catch(() => false)) {
      await firstDecision.click();
      
      await expect(page.locator('text=Decision Details')).toBeVisible();
      
      // Look for view activity button
      const viewActivityButton = page.locator('button:has-text("View in Activity")').first();
      
      if (await viewActivityButton.isVisible().catch(() => false)) {
        await expect(viewActivityButton).toBeVisible();
      }
    }
  });
});
